defmodule Timbre.Recordings do
  import Ecto.Query

  alias Timbre.Recordings.Recording
  alias Timbre.Recordings.Storage
  alias Timbre.Repo

  @extensions %{"audio/webm" => "webm", "audio/mp4" => "mp4"}

  def list_recordings do
    Repo.all(from(recording in Recording, order_by: [desc: recording.inserted_at]))
  end

  def get_recording(id) do
    case Repo.get(Recording, id) do
      nil -> {:error, :not_found}
      recording -> {:ok, recording}
    end
  end

  def create_recording(%{audio: audio, mime_type: mime_type, duration_ms: duration_ms} = attrs)
      when is_binary(audio) and is_binary(mime_type) and is_integer(duration_ms) do
    case Map.fetch(@extensions, mime_type) do
      {:ok, extension} ->
        storage_key = "#{Ecto.UUID.generate()}.#{extension}"

        attrs = %{
          title: Map.get(attrs, :title) || generated_title(),
          mime_type: mime_type,
          extension: extension,
          size_bytes: byte_size(audio),
          duration_ms: duration_ms,
          storage_key: storage_key
        }

        changeset = Recording.changeset(%Recording{}, attrs)

        with {:ok, _} <- Ecto.Changeset.apply_action(changeset, :insert),
             :ok <- Storage.put(storage_key, audio),
             {:ok, recording} <- Repo.insert(changeset) do
          {:ok, recording}
        else
          {:error, %Ecto.Changeset{} = changeset} ->
            {:error, changeset}

          {:error, reason} ->
            _ = Storage.delete(storage_key)
            {:error, reason}
        end

      :error ->
        {:error, Recording.changeset(%Recording{}, %{mime_type: mime_type})}
    end
  end

  def read_audio(%Recording{storage_key: storage_key}), do: Storage.read(storage_key)

  def rename_recording(%Recording{} = recording, title) when is_binary(title) do
    recording
    |> Recording.changeset(%{title: title})
    |> Repo.update()
  end

  def delete_recording(%Recording{} = recording) do
    with :ok <- Storage.delete(recording.storage_key) do
      Repo.delete(recording)
    end
  end

  defp generated_title do
    "Recording #{DateTime.utc_now() |> Calendar.strftime("%Y-%m-%d %H:%M UTC")}"
  end
end
