"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { Camera, LoaderCircle, UserRound, X } from "lucide-react";
import { Modal } from "./modal";
import { useLanguage } from "./language-provider";
import type { Profile } from "@/lib/types";

async function prepareAvatar(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5_000_000
  )
    throw new Error("Choose a JPG, PNG or WebP image under 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read this image.");
    const size = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - size) / 2,
      (bitmap.height - size) / 2,
      size,
      size,
      0,
      0,
      256,
      256,
    );
    const data = canvas.toDataURL("image/webp", 0.82);
    if (data.length > 150_000)
      throw new Error("This image is too large. Try a smaller one.");
    return data;
  } finally {
    bitmap.close();
  }
}

export function Avatar({ profile }: { profile: Profile }) {
  return (
    <span className="avatar">
      {profile.avatar_data ? (
        <img src={profile.avatar_data} alt="" width="32" height="32" />
      ) : (
        <UserRound size={18} aria-hidden="true" />
      )}
    </span>
  );
}

export function ProfileDialog({
  profile,
  onSave,
  onClose,
}: {
  profile: Profile;
  onSave: (profile: Profile) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageSequence = useRef(0);
  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const sequence = ++imageSequence.current;
    setReading(true);
    setError("");
    try {
      const avatar_data = await prepareAvatar(file);
      if (sequence === imageSequence.current)
        setDraft((value) => ({ ...value, avatar_data }));
    } catch (error) {
      if (sequence === imageSequence.current)
        setError(t((error as Error).message));
    } finally {
      if (sequence === imageSequence.current) setReading(false);
      event.target.value = "";
    }
  }
  return (
    <Modal title={t("Profile")} onClose={() => !busy && onClose()}>
      <form
        className="manual-form profile-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave(draft);
            onClose();
          } catch (error) {
            setError(t((error as Error).message));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="profile-photo">
          <Avatar profile={draft} />
          <div>
            <button
              className="button"
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy || reading}
            >
              <Camera size={15} />
              {t("Choose photo")}
            </button>
            {draft.avatar_data && (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  imageSequence.current++;
                  setReading(false);
                  setDraft((value) => ({ ...value, avatar_data: null }));
                }}
              >
                <X size={13} />
                {t("Remove photo")}
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          aria-label={t("Profile photo")}
          onChange={choosePhoto}
        />
        <label htmlFor="profile-name">{t("Display name")}</label>
        <input
          id="profile-name"
          value={draft.display_name}
          onChange={(event) =>
            setDraft((value) => ({
              ...value,
              display_name: event.target.value,
            }))
          }
          required
          maxLength={80}
          disabled={busy}
        />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            {t("Cancel")}
          </button>
          <button
            className="button primary"
            disabled={busy || reading || !draft.display_name.trim()}
          >
            {busy && <LoaderCircle size={15} className="spin" />}
            {t("Save profile")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
