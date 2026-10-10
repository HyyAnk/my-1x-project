import { Plus, Trash, YoutubeLogo } from "@phosphor-icons/react";
import { CHANNEL_ABOUT_TEXT_MAX_LENGTH } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { PublishingProfileForm } from "../hooks/usePublishingProfileForm";

type ChannelPublishingProfileFieldsProps = {
  form: PublishingProfileForm;
  disabled?: boolean;
};

export function ChannelPublishingProfileFields({ form, disabled = false }: ChannelPublishingProfileFieldsProps) {
  const { t } = useTranslation();
  const { draft, errors } = form;

  return (
    <fieldset className="channel-publishing-section" disabled={disabled}>
      <legend className="channel-publishing-legend">
        <YoutubeLogo size={16} weight="fill" className="channel-publishing-logo" />
        <span>{t("channelPublishing.sectionTitle")}</span>
      </legend>
      <p className="channel-publishing-hint">{t("channelPublishing.sectionHint")}</p>

      <div className="channel-create-field">
        <label htmlFor="edit-channel-youtube-url" className="channel-create-label">
          {t("channelPublishing.channelUrlLabel")}
        </label>
        <input
          id="edit-channel-youtube-url"
          type="url"
          className="channel-create-input"
          value={draft.channelUrl}
          aria-invalid={errors.channelUrl}
          onChange={(event) => form.setChannelUrl(event.target.value)}
          placeholder={t("channelPublishing.channelUrlPlaceholder")}
        />
        {errors.channelUrl && <span className="channel-publishing-error">{t("channelPublishing.invalidUrl")}</span>}
      </div>

      <div className="channel-create-field">
        <label htmlFor="edit-channel-about-line" className="channel-create-label">
          {t("channelPublishing.aboutLabel")}
        </label>
        <input
          id="edit-channel-about-line"
          className="channel-create-input"
          maxLength={CHANNEL_ABOUT_TEXT_MAX_LENGTH}
          value={draft.aboutText}
          onChange={(event) => form.setAboutText(event.target.value)}
          placeholder={t("channelPublishing.aboutPlaceholder")}
        />
      </div>

      <div className="channel-create-field">
        <span className="channel-publishing-group-label">{t("channelPublishing.playlistsLabel")}</span>
        {draft.playlists.map((playlist) => (
          <div key={playlist.id} className="channel-publishing-playlist-row">
            <input
              className="channel-create-input"
              aria-label={t("channelPublishing.playlistTitlePlaceholder")}
              value={playlist.title}
              aria-invalid={errors.playlistIds.includes(playlist.id)}
              onChange={(event) => form.updatePlaylist(playlist.id, { title: event.target.value })}
              placeholder={t("channelPublishing.playlistTitlePlaceholder")}
            />
            <input
              type="url"
              className="channel-create-input"
              aria-label={t("channelPublishing.playlistUrlPlaceholder")}
              value={playlist.url}
              aria-invalid={errors.playlistIds.includes(playlist.id)}
              onChange={(event) => form.updatePlaylist(playlist.id, { url: event.target.value })}
              placeholder={t("channelPublishing.playlistUrlPlaceholder")}
            />
            <button
              type="button"
              className="quiet-button channel-publishing-remove"
              onClick={() => form.removePlaylist(playlist.id)}
              aria-label={t("channelPublishing.removePlaylist")}
              title={t("channelPublishing.removePlaylist")}
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
        {errors.playlistIds.length > 0 && <span className="channel-publishing-error">{t("channelPublishing.incompletePlaylist")}</span>}
        <button type="button" className="quiet-button channel-publishing-add" onClick={form.addPlaylist} disabled={!form.canAddPlaylist}>
          <Plus size={14} weight="bold" />
          <span>{t("channelPublishing.addPlaylist")}</span>
        </button>
      </div>
    </fieldset>
  );
}
