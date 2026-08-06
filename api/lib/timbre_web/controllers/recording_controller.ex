defmodule TimbreWeb.RecordingController do
  use TimbreWeb, :controller

  alias Timbre.Recordings

  @max_size_bytes 50 * 1_024 * 1_024

  def index(conn, _params) do
    render(conn, :index, recordings: Recordings.list_recordings())
  end

  def show(conn, %{"id" => id}) do
    with {:ok, recording} <- Recordings.get_recording(id) do
      render(conn, :show, recording: recording)
    else
      {:error, :not_found} -> send_resp(conn, :not_found, "")
    end
  end

  def create(conn, %{"audio" => %Plug.Upload{} = upload} = params) do
    with {:ok, %{size: size}} when size <= @max_size_bytes <- File.stat(upload.path),
         {:ok, audio} <- File.read(upload.path),
         {:ok, duration_ms} <- parse_duration(params["duration_ms"]),
         {:ok, recording} <-
           Recordings.create_recording(%{
             audio: audio,
             mime_type: upload.content_type,
             duration_ms: duration_ms,
             title: params["title"]
           }) do
      conn
      |> put_status(:created)
      |> render(:show, recording: recording)
    else
      {:error, %Ecto.Changeset{} = changeset} ->
        conn |> put_status(:unprocessable_entity) |> json(%{errors: errors(changeset)})

      _ ->
        conn |> put_status(:unprocessable_entity) |> json(%{errors: %{audio: ["is invalid"]}})
    end
  end

  def create(conn, _params) do
    conn |> put_status(:unprocessable_entity) |> json(%{errors: %{audio: ["is required"]}})
  end

  def update(conn, %{"id" => id, "title" => title}) do
    with {:ok, recording} <- Recordings.get_recording(id),
         {:ok, recording} <- Recordings.rename_recording(recording, title) do
      render(conn, :show, recording: recording)
    else
      {:error, :not_found} ->
        send_resp(conn, :not_found, "")

      {:error, changeset} ->
        conn |> put_status(:unprocessable_entity) |> json(%{errors: errors(changeset)})
    end
  end

  def delete(conn, %{"id" => id}) do
    with {:ok, recording} <- Recordings.get_recording(id),
         {:ok, _} <- Recordings.delete_recording(recording) do
      send_resp(conn, :no_content, "")
    else
      {:error, :not_found} -> send_resp(conn, :not_found, "")
      _ -> send_resp(conn, :internal_server_error, "")
    end
  end

  def audio(conn, %{"id" => id}) do
    with {:ok, recording} <- Recordings.get_recording(id),
         {:ok, audio} <- Recordings.read_audio(recording) do
      conn
      |> put_resp_content_type(recording.mime_type)
      |> put_resp_header("content-disposition", "inline")
      |> send_resp(:ok, audio)
    else
      _ -> send_resp(conn, :not_found, "")
    end
  end

  defp parse_duration(value) when is_binary(value) do
    case Integer.parse(value) do
      {duration_ms, ""} when duration_ms >= 0 -> {:ok, duration_ms}
      _ -> {:error, :invalid_duration}
    end
  end

  defp parse_duration(value) when is_integer(value) and value >= 0, do: {:ok, value}
  defp parse_duration(_value), do: {:error, :invalid_duration}

  defp errors(changeset),
    do: Ecto.Changeset.traverse_errors(changeset, fn {message, _} -> message end)
end
