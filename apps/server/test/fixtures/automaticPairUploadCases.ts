import { expect, it } from "vitest";
import type { IntroOutroStyle } from "@studio/shared";
import type { StudioApp } from "../../src/app.js";
import { probeAndValidate1080pVideo } from "../../src/utils/videoMediaProbe.js";

export function registerAutomaticPairUploadCases(get: () => { app: StudioApp; channelId: string; video: string }) {
  it("archives an uploaded workspace and opens a new blank one without losing its prompt snapshot", async () => {
    const { app, channelId, video } = get();
    const open = () =>
      app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-pair-workspace`,
        payload: { style_preset_id: "preset_cyber_neon" },
      });
    const project = (await open()).json<{ project: { project_id: string; version: number } }>().project;
    const payload = {
      auto_name: true,
      style_id: "workspace_upload",
      style_preset_id: "preset_cyber_neon",
      intro_data: video,
      outro_data: video,
      intro_script_text: "Pasted intro",
      outro_script_text: "Pasted outro",
      script_project_id: project.project_id,
      script_project_version: project.version,
    };
    const uploaded = await app.server.inject({ method: "POST", url: `/api/channels/${channelId}/intro-outro-styles`, payload });
    expect(uploaded.statusCode).toBe(201);
    expect(uploaded.json<{ style: IntroOutroStyle }>().style.intro.script_text).toBe("Pasted intro");
    const reopened = (await open()).json<{ project: { project_id: string } }>().project;
    expect(reopened.project_id).not.toBe(project.project_id);
    const retry = await app.server.inject({ method: "POST", url: `/api/channels/${channelId}/intro-outro-styles`, payload });
    expect(retry.statusCode).toBe(201);
  });

  it("numbers concurrent pairs, mutes each clip independently and makes retries idempotent", async () => {
    const { app, channelId, video } = get();
    const url = `/api/channels/${channelId}/intro-outro-styles`;
    const payload = (id: string, introMute: boolean) => ({
      style_id: id,
      auto_name: true,
      style_preset_id: "preset_arcade_classic",
      intro_data: video,
      outro_data: video,
      intro_mute_audio: introMute,
      outro_mute_audio: !introMute,
      intro_script_text: "Manual intro",
      outro_script_text: "Manual outro",
    });
    const inputs = [payload("pair_number_one", true), payload("pair_number_two", false)];
    const responses = await Promise.all(inputs.map((input) => app.server.inject({ method: "POST", url, payload: input })));
    expect(responses.map((response) => response.statusCode)).toEqual([201, 201]);
    const pairs = responses.map((response) => response.json<{ style: IntroOutroStyle }>().style);
    expect(pairs.map((pair) => pair.name).sort()).toEqual(["001", "002"]);
    for (const [index, pair] of pairs.entries()) {
      expect(pair.transition_type).toBe("stinger_swipe");
      expect(pair.transition_duration_seconds).toBe(0.5);
      expect(pair.intro.script_text).toBe("Manual intro");
      const intro = await probeAndValidate1080pVideo(await app.repository.getIntroOutroClipPath(channelId, pair.style_id, "intro"));
      const outro = await probeAndValidate1080pVideo(await app.repository.getIntroOutroClipPath(channelId, pair.style_id, "outro"));
      expect(intro.has_audio).toBe(index === 1);
      expect(outro.has_audio).toBe(index === 0);
    }
    const retry = await app.server.inject({ method: "POST", url, payload: inputs[0] });
    expect(retry.json<{ style: IntroOutroStyle }>().style.style_id).toBe(pairs[0].style_id);
    const conflict = await app.server.inject({ method: "POST", url, payload: { ...inputs[0], intro_script_text: "Different" } });
    expect(conflict.statusCode).not.toBe(201);
    await app.server.inject({ method: "DELETE", url: `${url}/${pairs[1].style_id}` });
    const next = await app.server.inject({ method: "POST", url, payload: payload("pair_number_three", false) });
    expect(next.json<{ style: IntroOutroStyle }>().style.name).toBe("003");
  });
}
