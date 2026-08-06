defmodule TimbreWeb.RecordingJSON do
  alias Timbre.Recordings.Recording

  def index(%{recordings: recordings}), do: %{data: Enum.map(recordings, &recording/1)}
  def show(%{recording: recording}), do: %{data: recording(recording)}

  def recording(%Recording{} = recording) do
    %{
      id: recording.id,
      title: recording.title,
      mime_type: recording.mime_type,
      size_bytes: recording.size_bytes,
      duration_ms: recording.duration_ms,
      created_at: recording.inserted_at,
      audio_url: "/api/recordings/#{recording.id}/audio"
    }
  end
end
