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

from app.models.category_profile.features import (
    CATEGORY_PROFILE_NUMERIC_FEATURES,
    CATEGORY_PROFILE_STRING_FEATURES,
    build_category_profiles,
)
from app.models.onboarding_category_tower.user_profiles import (
    SYNTHETIC_VARIANTS_PER_CATEGORY,
    USER_NUMERIC_FIELDS,
    USER_TOWER_FEATURE_SCALE,
    generate_synthetic_user_profiles,
)

SERVICE_ROOT = Path(__file__).resolve().parents[3]
ARTIFACT_DIR = SERVICE_ROOT / ".artifacts" / "onboarding_category_tower"
SEED = 42
USER_STRING_FEATURES: list[str] = []
ITEM_STRING_FEATURES = CATEGORY_PROFILE_STRING_FEATURES.copy()
ITEM_NUMERIC_FEATURES = CATEGORY_PROFILE_NUMERIC_FEATURES.copy()


def _tensor_dict(
    frame: pd.DataFrame,
    columns: list[str],
    string_columns: set[str] | None = None,
) -> dict[str, Any]:
    string_columns = string_columns or set()
    result: dict[str, Any] = {}
    for column in columns:
        if column in string_columns or frame[column].dtype == object:
            result[column] = frame[column].astype(str).to_numpy()
        else:
            result[column] = frame[column].astype("float32").to_numpy()
    return result


def _training_frames(data_mode: str = "sample") -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    users = generate_synthetic_user_profiles(data_mode=data_mode, seed=SEED)
    items = build_category_profiles(data_mode=data_mode, trainable_only=True).copy()

    positives = users.merge(
        items,
        left_on="target_category_code",
        right_on="service_category_code",
        how="inner",
    )
    train_rows = positives[positives["variant_index"] < SYNTHETIC_VARIANTS_PER_CATEGORY - 1].copy()
    eval_users = users[users["variant_index"] == SYNTHETIC_VARIANTS_PER_CATEGORY - 1].copy()

    for column in ITEM_STRING_FEATURES:
        items[column] = items[column].fillna("unknown").astype(str)
        train_rows[column] = train_rows[column].fillna("unknown").astype(str)

    return users, items, train_rows, eval_users


def build_model(items: pd.DataFrame) -> Any:
    import tensorflow as tf
    import tensorflow_recommenders as tfrs

    class UserTower(tf.keras.Model):
        def __init__(self) -> None:
            super().__init__()
            self.dense = tf.keras.Sequential(
                [
                    tf.keras.layers.Dense(96, activation="relu"),
                    tf.keras.layers.Dense(48, activation="relu"),
                    tf.keras.layers.Dense(32),
                ]
            )

        def call(self, features: dict[str, Any]) -> Any:
            numeric = [tf.cast(features[name], tf.float32)[:, tf.newaxis] for name in USER_NUMERIC_FIELDS]
            return self.dense(tf.concat(numeric, axis=1))

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
                    tf.keras.layers.Dense(96, activation="relu"),
                    tf.keras.layers.Dense(48, activation="relu"),
                    tf.keras.layers.Dense(32),
                ]
            )

        def call(self, features: dict[str, Any]) -> Any:
            string_parts = [self.embeddings[name](self.lookups[name](features[name])) for name in ITEM_STRING_FEATURES]
            numeric = [tf.cast(features[name], tf.float32)[:, tf.newaxis] for name in ITEM_NUMERIC_FEATURES]
            return self.dense(tf.concat([*string_parts, *numeric], axis=1))

    class OnboardingCategoryTwoTower(tfrs.Model):
        def __init__(self) -> None:
            super().__init__()
            self.user_model = UserTower()
            self.item_model = ItemTower()
            self.task = tfrs.tasks.Retrieval()

        def compute_loss(self, features: dict[str, Any], training: bool = False) -> Any:
            user_embeddings = self.user_model({name: features[name] for name in USER_NUMERIC_FIELDS})
            item_embeddings = self.item_model(
                {name: features[name] for name in [*ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES]}
            )
            return self.task(user_embeddings, item_embeddings, compute_metrics=False)

    return OnboardingCategoryTwoTower()


def _evaluate_model(model: Any, items: pd.DataFrame, eval_users: pd.DataFrame) -> tuple[float, float]:
    import tensorflow as tf

    item_input = _tensor_dict(
        items,
        [*ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES],
        string_columns=set(ITEM_STRING_FEATURES),
    )
    item_embeddings = model.item_model(
        {name: tf.convert_to_tensor(value) for name, value in item_input.items()}
    ).numpy()
    user_input = _tensor_dict(eval_users, USER_NUMERIC_FIELDS)
    user_embeddings = model.user_model(
        {name: tf.convert_to_tensor(value) for name, value in user_input.items()}
    ).numpy()
    scores = user_embeddings @ item_embeddings.T
    item_codes = items["service_category_code"].astype(str).tolist()

    hit_count = 0
    reciprocal_ranks: list[float] = []
    for user_index, target_code in enumerate(eval_users["target_category_code"].astype(str).tolist()):
        ranking = np.argsort(-scores[user_index])
        ranked_codes = [item_codes[index] for index in ranking]
        if target_code in ranked_codes[:3]:
            hit_count += 1
        reciprocal_rank = 0.0
        for rank, code in enumerate(ranked_codes, start=1):
            if code == target_code:
                reciprocal_rank = 1.0 / rank
                break
        reciprocal_ranks.append(reciprocal_rank)

    hit_rate_at_3 = hit_count / max(len(eval_users), 1)
    mrr = float(np.mean(reciprocal_ranks)) if reciprocal_ranks else 0.0
    return round(hit_rate_at_3, 6), round(mrr, 6)


def train_and_save(epochs: int = 24, data_mode: str = "sample") -> dict[str, Any]:
    import tensorflow as tf

    tf.random.set_seed(SEED)
    users, items, train_rows, eval_users = _training_frames(data_mode=data_mode)
    train_columns = [*USER_NUMERIC_FIELDS, *ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES]
    dataset = tf.data.Dataset.from_tensor_slices(
        _tensor_dict(
            train_rows,
            train_columns,
            string_columns=set(ITEM_STRING_FEATURES),
        )
    ).shuffle(
        len(train_rows),
        seed=SEED,
        reshuffle_each_iteration=True,
    ).batch(16)

    model = build_model(items)
    try:
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
    hit_rate_at_3, mrr = _evaluate_model(model, items, eval_users)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model.user_model.save_weights(ARTIFACT_DIR / "user_tower.weights.h5")
    model.item_model.save_weights(ARTIFACT_DIR / "item_tower.weights.h5")

    embeddings = items[
        [
            "service_category_code",
            "service_category_name",
            "category_group",
        ]
    ].copy()
    for dim in range(item_embeddings.shape[1]):
        embeddings[f"embedding_{dim}"] = item_embeddings[:, dim]
    embeddings.to_csv(ARTIFACT_DIR / "category_embeddings.csv", index=False)

    metadata = {
        "model_id": "onboarding_category_tower",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "epochs": epochs,
        "rows": int(len(train_rows)),
        "user_count": int(len(users)),
        "category_count": int(len(items)),
        "embedding_dim": int(item_embeddings.shape[1]),
        "final_loss": round(float(history.history["loss"][-1]), 6),
        "hit_rate_at_3": hit_rate_at_3,
        "mrr": mrr,
        "user_tower_feature_scale": USER_TOWER_FEATURE_SCALE,
        "artifact_paths": {
            "user_tower": ".artifacts/onboarding_category_tower/user_tower.weights.h5",
            "item_tower": ".artifacts/onboarding_category_tower/item_tower.weights.h5",
            "category_embeddings": ".artifacts/onboarding_category_tower/category_embeddings.csv",
        },
        "user_numeric_features": USER_NUMERIC_FIELDS,
        "item_string_features": ITEM_STRING_FEATURES,
        "item_numeric_features": ITEM_NUMERIC_FEATURES,
    }
    (ARTIFACT_DIR / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return metadata


def load_model(data_mode: str = "sample") -> tuple[Any, dict[str, Any]]:
    import tensorflow as tf

    metadata_path = ARTIFACT_DIR / "metadata.json"
    if not metadata_path.exists():
        metadata = train_and_save(data_mode=data_mode)
    else:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))

    items = build_category_profiles(data_mode=data_mode, trainable_only=True).copy()
    model = build_model(items)
    sample_item = items.iloc[[0]]
    sample_user = generate_synthetic_user_profiles(data_mode=data_mode, seed=SEED).iloc[[0]]
    _ = model.user_model(
        {
            name: tf.convert_to_tensor(_tensor_dict(sample_user, USER_NUMERIC_FIELDS)[name])
            for name in USER_NUMERIC_FIELDS
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
    parser.add_argument("--epochs", type=int, default=24)
    parser.add_argument("--data-mode", type=str, default="sample")
    args = parser.parse_args()
    print(json.dumps(train_and_save(epochs=args.epochs, data_mode=args.data_mode), ensure_ascii=False, indent=2))
