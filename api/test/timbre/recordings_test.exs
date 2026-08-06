defmodule Timbre.RecordingsTest do
  use ExUnit.Case, async: false

  alias Ecto.Adapters.SQL.Sandbox
  alias Timbre.Recordings
  alias Timbre.Repo

  setup do
    :ok = Sandbox.checkout(Repo)

    root = Path.join(System.tmp_dir!(), "timbre-recordings-#{System.unique_integer([:positive])}")
    previous = Application.get_env(:timbre, :recordings_storage_path)
    Application.put_env(:timbre, :recordings_storage_path, root)

    on_exit(fn ->
      File.rm_rf(root)
      Application.put_env(:timbre, :recordings_storage_path, previous)
    end)

    :ok
  end

  test "creates metadata and stores the uploaded audio" do
    attrs = %{audio: "audio bytes", mime_type: "audio/webm", duration_ms: 1_500}

    assert {:ok, recording} = Recordings.create_recording(attrs)
    assert recording.title =~ "Recording"
    assert recording.mime_type == "audio/webm"
    assert recording.extension == "webm"
    assert recording.size_bytes == byte_size(attrs.audio)
    assert recording.duration_ms == 1_500
    assert {:ok, "audio bytes"} = Recordings.read_audio(recording)
    assert [^recording] = Recordings.list_recordings()
    assert {:ok, ^recording} = Recordings.get_recording(recording.id)
  end

  test "renames and deletes a recording with its audio" do
    {:ok, recording} =
      Recordings.create_recording(%{audio: "audio", mime_type: "audio/mp4", duration_ms: 0})

    assert {:ok, renamed} = Recordings.rename_recording(recording, "Meeting notes")
    assert renamed.title == "Meeting notes"

    assert {:ok, deleted} = Recordings.delete_recording(renamed)
    assert deleted.id == renamed.id
    assert {:error, :not_found} = Recordings.read_audio(renamed)
    assert [] = Recordings.list_recordings()
  end

  test "rejects recordings longer than ten minutes" do
    assert {:error, changeset} =
             Recordings.create_recording(%{
               audio: "audio",
               mime_type: "audio/webm",
               duration_ms: 600_001
             })

    assert "must be less than or equal to %{number}" in errors_on(changeset).duration_ms
  end

  defp errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
  end
end
