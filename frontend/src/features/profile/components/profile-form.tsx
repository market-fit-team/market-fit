"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Avatar from "boring-avatars"
import { RefreshCcw } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { authClient } from "@/features/auth/lib/auth-client"
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  createProfileAvatarSeed,
  resolveProfileCompletionRedirectTarget,
} from "@/features/profile/lib/profile-defaults"
import {
  type ProfileFormValues,
  profileFormSchema,
} from "@/features/profile/lib/profile-form-schema"
import { JOBS } from "@/features/profile/lib/profile-jobs"
import { patchMyProfile } from "@/shared/api/generated/profile/endpoints/profile/profile"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Spinner } from "@/shared/components/ui/spinner"
import { avatarColors } from "@/shared/lib/boring-avatars"

type ProfileFormProps = {
  callbackURL: string
  initialAge: number | null
  initialAvatarSeed: string
  initialDisplayName: string
  initialJob: string | null
  requiresInitialization: boolean
}

const EMPTY_JOB_VALUE = "__none__"

const getErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail
  }

  if (error instanceof Error) {
    return error.message
  }

  return "프로필 저장에 실패했습니다."
}

export function ProfileForm({
  callbackURL,
  initialAge,
  initialAvatarSeed,
  initialDisplayName,
  initialJob,
  requiresInitialization,
}: ProfileFormProps) {
  const router = useRouter()
  const [hasAvatarBeenClicked, setHasAvatarBeenClicked] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ProfileFormValues>({
    defaultValues: {
      age: initialAge?.toString() ?? "",
      avatarSeed: initialAvatarSeed,
      displayName: initialDisplayName,
      job: initialJob ?? "",
    },
    mode: "onChange",
    delayError: 300,
    resolver: zodResolver(profileFormSchema),
  })

  const avatarSeed = useWatch({
    control: form.control,
    name: "avatarSeed",
  })
  const selectedJob = useWatch({
    control: form.control,
    name: "job",
  })
  const canSubmit =
    form.formState.isValid &&
    !isPending &&
    (requiresInitialization || form.formState.isDirty)

  const handleSubmit = (values: ProfileFormValues) => {
    startTransition(async () => {
      try {
        const age = values.age === "" ? null : Number(values.age)
        const job = values.job === "" ? null : values.job

        await patchMyProfile({
          age,
          avatar_seed: values.avatarSeed,
          display_name: values.displayName,
          job,
        })
        await authClient.updateUser({
          age,
          avatarSeed: values.avatarSeed,
          displayName: values.displayName,
          job,
        })
        toast.success("프로필을 저장했습니다.")
        router.push(resolveProfileCompletionRedirectTarget(callbackURL))
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    })
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="space-y-2">
        <CardTitle>프로필 설정</CardTitle>
        <CardDescription>
          닉네임과 아바타를 설정하고, 선택 입력으로 나이와 직업을 채울 수
          있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="avatar-seed">아바타</FieldLabel>
              <FieldContent>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="group relative overflow-hidden rounded-full border"
                    onClick={() => {
                      setHasAvatarBeenClicked(true)
                      form.setValue("avatarSeed", createProfileAvatarSeed(), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  >
                    <Avatar
                      colors={avatarColors}
                      name={avatarSeed}
                      size={72}
                      variant="beam"
                    />
                    {!hasAvatarBeenClicked ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        클릭해서 변경
                      </span>
                    ) : null}
                    <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-black/45 text-white">
                      <RefreshCcw className="size-3" />
                    </span>
                  </button>
                  <div className="flex flex-col gap-2">
                    <FieldDescription>
                      아바타를 클릭할 때마다 랜덤 seed로 다시 생성됩니다.
                    </FieldDescription>
                  </div>
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="display-name">닉네임</FieldLabel>
              <FieldContent>
                <Input
                  id="display-name"
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  placeholder="닉네임을 입력하세요"
                  {...form.register("displayName")}
                />
                <FieldDescription>
                  {DISPLAY_NAME_MIN_LENGTH}~{DISPLAY_NAME_MAX_LENGTH}자,
                  공백/특수문자 없이 영문, 한글, 숫자만 사용할 수 있습니다.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.displayName]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="age">나이</FieldLabel>
              <FieldContent>
                <Input
                  id="age"
                  inputMode="numeric"
                  min={0}
                  max={150}
                  placeholder="선택 입력"
                  type="number"
                  {...form.register("age")}
                />
                <FieldError errors={[form.formState.errors.age]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="job">직업</FieldLabel>
              <FieldContent>
                <Select
                  name="job"
                  value={selectedJob === "" ? EMPTY_JOB_VALUE : selectedJob}
                  onValueChange={(value) => {
                    form.setValue(
                      "job",
                      value === EMPTY_JOB_VALUE ? "" : value,
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      }
                    )
                  }}
                >
                  <SelectTrigger
                    aria-invalid={form.formState.errors.job ? true : undefined}
                    className="w-full"
                    id="job"
                  >
                    <SelectValue placeholder="선택 안 함" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value={EMPTY_JOB_VALUE}>선택 안 함</SelectItem>
                    {JOBS.map((job) => (
                      <SelectItem key={job} value={job}>
                        {job}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>직업은 선택 입력입니다.</FieldDescription>
                <FieldError errors={[form.formState.errors.job]} />
              </FieldContent>
            </Field>
          </FieldGroup>

          <div className="flex justify-end">
            <Button disabled={!canSubmit} type="submit">
              {isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                "저장하고 계속하기"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
