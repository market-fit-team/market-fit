from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

from app.models.onboarding_two_tower.user_profiles import (
    USER_NUMERIC_FIELDS,
    USER_TOWER_FEATURE_SCALE,
    build_user_item_labels,
    load_user_profiles,
)
from app.models.item_catalog.features import build_item_features

SERVICE_ROOT = Path(__file__).resolve().parents[3]
ARTIFACT_DIR = SERVICE_ROOT / ".artifacts" / "onboarding_two_tower"
SEED = 42
USER_STRING_FEATURES = ["preferred_category_code"]
ITEM_STRING_FEATURES = [
    "item_id",
    "area_code",
    "service_category_code",
    "subway_coverage_level",
    "area_profile_type",
]
ITEM_NUMERIC_FEATURES = [
    "sales_amount",
    "sales_count",
    "sales_per_count",
    "weekend_sales_ratio",
    "evening_sales_ratio",
    "subway_commercial_trend_score",
    "sales_momentum_up_probability",
    "sales_momentum_down_probability",
    "category_opportunity_score",
    "demand_gap_score",
    "startup_cost_million_krw_proxy",
    "resident_population",
    "worker_population",
    "living_population",
    "food_consumption_ratio",
    "apartment_average_price",
    "attraction_facility_count",
    "subway_station_count",
]
ITEM_SCALES = {
    "sales_amount": 1_000_000_000.0,
    "sales_count": 200_000.0,
    "sales_per_count": 100_000.0,
    "weekend_sales_ratio": 1.0,
    "evening_sales_ratio": 1.0,
    "subway_commercial_trend_score": 1.0,
    "sales_momentum_up_probability": 1.0,
    "sales_momentum_down_probability": 1.0,
    "category_opportunity_score": 1.0,
    "demand_gap_score": 1.0,
    "startup_cost_million_krw_proxy": 300.0,
    "resident_population": 80_000.0,
    "worker_population": 80_000.0,
    "living_population": 120_000.0,
    "food_consumption_ratio": 1.0,
    "apartment_average_price": 400_000_000.0,
    "attraction_facility_count": 500.0,
    "subway_station_count": 20.0,
}


def _tensor_dict(
    frame: pd.DataFrame,
    columns: list[str],
    string_columns: set[str] | None = None,
) -> dict[str, Any]:
    # StringLookup가 받는 열은 dtype이 섞여 있어도 문자열로 강제한다.
    string_columns = string_columns or set()
    result: dict[str, Any] = {}
    for column in columns:
        if column in string_columns or frame[column].dtype == object:
            result[column] = frame[column].astype(str).to_numpy()
        else:
            result[column] = frame[column].astype("float32").to_numpy()
    return result


def _training_frames() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    users = load_user_profiles().copy()
    items = build_item_features(data_mode="sample").copy()
    for column in USER_STRING_FEATURES:
        users[column] = users[column].fillna("unknown").astype(str)
    for column in ITEM_STRING_FEATURES:
        items[column] = items[column].fillna("unknown").astype(str)
    labels = build_user_item_labels(users, items)
    positives = labels[labels["label"] == 1].merge(users, on="user_id", how="left").merge(
        items,
        on=["item_id", "area_code", "area_name", "service_category_code", "service_category_name"],
        how="left",
    )
    for column in USER_STRING_FEATURES:
        positives[column] = positives[column].fillna("unknown").astype(str)
    for column in ITEM_STRING_FEATURES:
        positives[column] = positives[column].fillna("unknown").astype(str)
    return users, items, positives


def build_model(users: pd.DataFrame, items: pd.DataFrame) -> Any:
    import tensorflow as tf
    import tensorflow_recommenders as tfrs

    class UserTower(tf.keras.Model):
        def __init__(self) -> None:
            super().__init__()
            self.lookups = {
                name: tf.keras.layers.StringLookup(
                    vocabulary=sorted(users[name].astype(str).unique()),
                    mask_token=None,
                )
                for name in USER_STRING_FEATURES
            }
            self.embeddings = {
                name: tf.keras.layers.Embedding(
                    len(self.lookups[name].get_vocabulary()) + 1,
                    8,
                )
                for name in USER_STRING_FEATURES
            }
            self.dense = tf.keras.Sequential(
                [
                    tf.keras.layers.Dense(64, activation="relu"),
                    tf.keras.layers.Dense(32),
                ]
            )

        def call(self, features: dict[str, Any]) -> Any:
            parts = [self.embeddings[name](self.lookups[name](features[name])) for name in USER_STRING_FEATURES]
            numeric = [tf.cast(features[name], tf.float32)[:, tf.newaxis] for name in USER_NUMERIC_FIELDS]
            return self.dense(tf.concat([*parts, *numeric], axis=1))

    class ItemTower(tf.keras.Model):
        def __init__(self) -> None:
            super().__init__()
            self.lookups = {
                name: tf.keras.layers.StringLookup(
                    vocabulary=sorted(items[name].astype(str).unique()),
                    mask_token=None,
                )
                for name in ITEM_STRING_FEATURES
            }
            self.embeddings = {
                name: tf.keras.layers.Embedding(
                    len(self.lookups[name].get_vocabulary()) + 1,
                    8,
                )
                for name in ITEM_STRING_FEATURES
            }
            self.dense = tf.keras.Sequential(
                [
                    tf.keras.layers.Dense(64, activation="relu"),
                    tf.keras.layers.Dense(32),
                ]
            )

        def call(self, features: dict[str, Any]) -> Any:
            parts = [self.embeddings[name](self.lookups[name](features[name])) for name in ITEM_STRING_FEATURES]
            numeric = [
                tf.cast(features[name], tf.float32)[:, tf.newaxis] / ITEM_SCALES[name]
                for name in ITEM_NUMERIC_FEATURES
            ]
            return self.dense(tf.concat([*parts, *numeric], axis=1))

    class OnboardingTwoTower(tfrs.Model):
        def __init__(self) -> None:
            super().__init__()
            self.user_model = UserTower()
            self.item_model = ItemTower()
            self.task = tfrs.tasks.Retrieval()

        def compute_loss(self, features: dict[str, Any], training: bool = False) -> Any:
            user_embeddings = self.user_model(
                {name: features[name] for name in [*USER_STRING_FEATURES, *USER_NUMERIC_FIELDS]}
            )
            item_embeddings = self.item_model(
                {name: features[name] for name in [*ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES]}
            )
            return self.task(user_embeddings, item_embeddings, compute_metrics=False)

    return OnboardingTwoTower()


def train_and_save(epochs: int = 20) -> dict[str, Any]:
    import tensorflow as tf

    tf.random.set_seed(SEED)
    users, items, positives = _training_frames()
    train_columns = [*USER_STRING_FEATURES, *USER_NUMERIC_FIELDS, *ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES]
    dataset = tf.data.Dataset.from_tensor_slices(
        _tensor_dict(
            positives,
            train_columns,
            string_columns={*USER_STRING_FEATURES, *ITEM_STRING_FEATURES},
        )
    ).shuffle(
        len(positives),
        seed=SEED,
        reshuffle_each_iteration=True,
    ).batch(8)

    model = build_model(users, items)
    try:
        # macOS에서 legacy optimizer가 더 안정적으로 동작한다.
        optimizer = tf.keras.optimizers.legacy.Adagrad(learning_rate=0.05)
    except AttributeError:
        optimizer = tf.keras.optimizers.Adagrad(learning_rate=0.05)
    model.compile(optimizer=optimizer)
    history = model.fit(dataset, epochs=epochs, verbose=0)

    item_input = _tensor_dict(
        items,
        [*ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES],
        string_columns=set(ITEM_STRING_FEATURES),
    )
    item_embeddings = model.item_model(
        {name: tf.convert_to_tensor(value) for name, value in item_input.items()}
    ).numpy()
    user_input = _tensor_dict(
        users,
        [*USER_STRING_FEATURES, *USER_NUMERIC_FIELDS],
        string_columns=set(USER_STRING_FEATURES),
    )
    user_embeddings = model.user_model(
        {name: tf.convert_to_tensor(value) for name, value in user_input.items()}
    ).numpy()
    scores = user_embeddings @ item_embeddings.T

    item_ids = items["item_id"].astype(str).tolist()
    labels = build_user_item_labels(users, items)
    positive_by_user = labels[labels["label"] == 1].groupby("user_id")["item_id"].apply(set).to_dict()
    hit_count = 0
    reciprocal_ranks: list[float] = []
    for user_index, user_id in enumerate(users["user_id"].tolist()):
        ranking = np.argsort(-scores[user_index])
        ranked_item_ids = [item_ids[index] for index in ranking]
        positives_for_user = positive_by_user.get(user_id, set())
        if set(ranked_item_ids[:3]) & positives_for_user:
            hit_count += 1
        reciprocal_rank = 0.0
        for rank, item_id in enumerate(ranked_item_ids, start=1):
            if item_id in positives_for_user:
                reciprocal_rank = 1.0 / rank
                break
        reciprocal_ranks.append(reciprocal_rank)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model.user_model.save_weights(ARTIFACT_DIR / "user_tower.weights.h5")
    model.item_model.save_weights(ARTIFACT_DIR / "item_tower.weights.h5")

    embeddings = items[
        [
            "item_id",
            "area_code",
            "area_name",
            "service_category_code",
            "service_category_name",
            "area_profile_type",
        ]
    ].copy()
    for dim in range(item_embeddings.shape[1]):
        embeddings[f"embedding_{dim}"] = item_embeddings[:, dim]
    embeddings.to_csv(ARTIFACT_DIR / "item_embeddings.csv", index=False)

    metadata = {
        "model_id": "onboarding_two_tower",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "epochs": epochs,
        "rows": int(len(positives)),
        "user_count": int(len(users)),
        "item_count": int(len(items)),
        "embedding_dim": int(item_embeddings.shape[1]),
        "final_loss": round(float(history.history["loss"][-1]), 6),
        "hit_rate_at_3": round(hit_count / len(users), 6),
        "mrr": round(float(np.mean(reciprocal_ranks)), 6),
        "user_tower_feature_scale": USER_TOWER_FEATURE_SCALE,
        "artifact_paths": {
            "user_tower": ".artifacts/onboarding_two_tower/user_tower.weights.h5",
            "item_tower": ".artifacts/onboarding_two_tower/item_tower.weights.h5",
            "item_embeddings": ".artifacts/onboarding_two_tower/item_embeddings.csv",
        },
        "user_string_features": USER_STRING_FEATURES,
        "user_numeric_features": USER_NUMERIC_FIELDS,
        "item_string_features": ITEM_STRING_FEATURES,
        "item_numeric_features": ITEM_NUMERIC_FEATURES,
    }
    (ARTIFACT_DIR / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return metadata


def load_model() -> tuple[Any, dict[str, Any]]:
    import tensorflow as tf

    metadata_path = ARTIFACT_DIR / "metadata.json"
    if not metadata_path.exists():
        metadata = train_and_save()
    else:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))

    users = load_user_profiles().copy()
    items = build_item_features(data_mode="sample").copy()
    model = build_model(users, items)
    sample_user = users.iloc[[0]]
    sample_item = items.iloc[[0]]
    _ = model.user_model(
        {
            name: tf.convert_to_tensor(
                _tensor_dict(
                    sample_user,
                    [*USER_STRING_FEATURES, *USER_NUMERIC_FIELDS],
                    string_columns=set(USER_STRING_FEATURES),
                )[name]
            )
            for name in [*USER_STRING_FEATURES, *USER_NUMERIC_FIELDS]
        }
    )
    _ = model.item_model(
        {
            name: tf.convert_to_tensor(
                _tensor_dict(
                    sample_item,
                    [*ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES],
                    string_columns=set(ITEM_STRING_FEATURES),
                )[name]
            )
            for name in [*ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES]
        }
    )
    model.user_model.load_weights(ARTIFACT_DIR / "user_tower.weights.h5")
    model.item_model.load_weights(ARTIFACT_DIR / "item_tower.weights.h5")
    return model, metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=20)
    args = parser.parse_args()
    print(json.dumps(train_and_save(epochs=args.epochs), ensure_ascii=False, indent=2))
