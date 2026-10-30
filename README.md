# MeetSimpler

MeetSimpler is a Windows app for turning meetings, lectures, and audio or video
recordings into transcripts, AI translations and useful summaries. Choose audio and visual
sources, capture screenshots manually or on a timer, record video, and combine
transcripts with selected images and PDFs using a compatible AI model.

Record multiple desktop, application window and camera sources to separate
local MP4 files with your selected microphone and output audio. Choose video
sources independently from screenshot sources, preview the selection, and adjust
resolution, frame rate and quality. Screenshots and videos are organized by source
under visual_capture_data/screenshots and visual_capture_data/videos in each meeting folder.

Automatic screenshot change detection reduces repeated images; manual captures
always save. Automatic capture removes unavailable screenshot sources and continues
with the remaining sources. Reselect a source and restart capture if none remain.
Keep records together
locally, organize screenshots by source, and name meeting folders from their
transcript or with your own suffix. AI naming suggestions keep the meeting running;
confirming a rename stops and saves it. Configurable screenshot shortcuts, Escape
and quick source selection help you work with fewer clicks.

The Analysis workspace combines live translation and chunk summaries with
selective analysis of highlighted text, a time range or the full transcript.
Choose a target language and enable Summary, Translation or both. Fold blocks,
inspect their Source, or use Update to regenerate a result. The dashboard and
Detailed analysis share the same results and controls. Translation offers On,
Off and Auto detection.

Summary: On summarizes completed transcript chunks; the growing chunk waits
until it closes. Choose how much detail summaries include and use earlier
summaries or running meeting memory for continuity. Review the memory's key
points and evidence ranges when needed. Selection menus can send
text or a whole folded block to AI chat for explanations or summaries. Chat
questions and replies form foldable blocks. Cancel stops an individual request;
Update regenerates its answer with the submitted attachments. Remove deletes
that question and reply from the conversation while keeping local attachment files.

Open AI model calls from Speech generation, or use AI Model Status on the
dashboard. Select a request row to inspect its prepared model, input
types and source filenames without displaying message text or credentials.
Check the request status and answer or error separately to confirm its outcome.

Dictate chat messages with local speech recognition and configurable voice commands.
Automatic sending defaults to a 1.5-second pause. To review drafts before sending,
turn off both automatic sending and voice commands. The microphone keeps listening
until you stop voice input.
See the [voice input guide](https://meetsimpler.github.io/meetsimpler-web/getting-started.html#voice-input)
for setup and the effect on meeting microphone capture.

Save online API connections and installed local models in AI provider config.
Check one configuration to use it for chat, summaries and script generation;
specialist local translation is selected separately. General local AI requires
a supported NVIDIA or AMD GPU; specialist local translation can use CPU.

The built-in local AI catalogue includes Qwen and Gemma models for chat,
summaries and script generation. HY-MT1.5 and TranslateGemma provide separately
selected specialist translation. HY-MT1.5 is available in 1.8B and 7B variants;
TranslateGemma in 4B and 12B. These translators run locally, including on CPU,
and need no online provider API key. Select them separately under Local translation
models. See the [translation model introduction](https://meetsimpler.github.io/meetsimpler-web/#local-translation).
The
[local AI guide](https://meetsimpler.github.io/meetsimpler-web/getting-started.html#local-ai)
explains setup and the current model-picker limits, including DeepSeek availability.

Turn a draft or meeting notes into local speech, or create narrated slide videos
with optional pointer highlights. Review scripts, choose a voice and language,
then find audio and MP4 outputs in Results. See the
[speech generation guide](https://meetsimpler.github.io/meetsimpler-web/getting-started.html#speech-generation).

Choose a shared script style for meeting narration and slide scripts, or save
your own instructions. Slide AI generation supports ranges, sequential batches,
optional surrounding context and a separate AI verifier. Retry only failed
slides while keeping successful results. See the
[script styles guide](https://meetsimpler.github.io/meetsimpler-web/getting-started.html#script-styles)
and [slide script guide](https://meetsimpler.github.io/meetsimpler-web/getting-started.html#slide-scripts).

Movement styles controls pointer motion separately from pointer appearance.
Choose a preset or save your own instructions. Fine timing uses saved synthesis
chunks, with editable segments inside fixed chunk boundaries. The aligner duration
limit is separate from speech generation. See the
[movement styles guide](https://meetsimpler.github.io/meetsimpler-web/getting-started.html#movement-styles)
and [fine timing guide](https://meetsimpler.github.io/meetsimpler-web/getting-started.html#fine-timing).

Local speech choices include Qwen3-TTS CustomVoice and Base (0.6B/1.7B),
Kokoro-82M, VoxCPM2, CosyVoice 3, Chatterbox Multilingual V3 and Chatterbox Turbo.
Choose built-in voices or supported reference-voice options, then review the
language, device and reference requirements before generating. TTS models are
installed separately from speech recognition and general AI models.

Import PDF, PowerPoint or slide images, prepare narration per slide and generate
its audio. Add optional pointer highlights, then export a narrated MP4 with your
chosen resolution, frame rate, quality and pauses. PowerPoint conversion
requires LibreOffice. See the
[model introduction](https://meetsimpler.github.io/meetsimpler-web/#tts-models)
and [presentation video guide](https://meetsimpler.github.io/meetsimpler-web/getting-started.html#presentation-video).
Preview individual pointer highlights or a full slide with seeking, zoom and
adjustable playback speed before exporting your video. See the
[playback snapshot](https://meetsimpler.github.io/meetsimpler-web/showcase.html#playback)
and [model installation guide](https://meetsimpler.github.io/meetsimpler-web/getting-started.html#model-installation).

Online profiles send enabled content to your chosen provider and need your own
API credentials; charges may apply. Local AI runs through installed Ollama
models. Account activation and renewal remain separate from either AI choice.

- [Official website](https://meetsimpler.github.io/meetsimpler-web/)
- [Windows downloads](https://github.com/meetsimpler/meetsimpler-releases/releases) — choose the installer EXE or portable ZIP under Assets
- [Getting started](https://meetsimpler.github.io/meetsimpler-web/getting-started.html)
- [Terms and privacy](https://meetsimpler.github.io/meetsimpler-web/legal/)

Questions or feedback: meetsimpler@gmail.com
