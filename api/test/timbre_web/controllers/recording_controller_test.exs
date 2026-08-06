defmodule TimbreWeb.RecordingControllerTest do
  use TimbreWeb.ConnCase, async: false

  alias Ecto.Adapters.SQL.Sandbox
  alias Timbre.Repo

  setup do
    :ok = Sandbox.checkout(Repo)

    root = Path.join(System.tmp_dir!(), "timbre-controller-#{System.unique_integer([:positive])}")
    previous = Application.get_env(:timbre, :recordings_storage_path)
    Application.put_env(:timbre, :recordings_storage_path, root)

    on_exit(fn ->
      File.rm_rf(root)
      Application.put_env(:timbre, :recordings_storage_path, previous)
    end)

    :ok
  end

  test "lists recordings", %{conn: conn} do
    conn = get(conn, ~p"/api/recordings")

    assert json_response(conn, 200) == %{"data" => []}
  end

  test "requires an audio upload when creating a recording", %{conn: conn} do
    conn = post(conn, ~p"/api/recordings", %{"duration_ms" => "100"})

    assert json_response(conn, 422) == %{"errors" => %{"audio" => ["is required"]}}
  end

  test "creates a recording and serves its stored audio", %{conn: conn} do
    upload_path =
      Path.join(System.tmp_dir!(), "timbre-upload-#{System.unique_integer([:positive])}.webm")

    File.write!(upload_path, "audio bytes")

    on_exit(fn -> File.rm(upload_path) end)

    upload = %Plug.Upload{path: upload_path, filename: "voice.webm", content_type: "audio/webm"}

    conn =
      post(conn, ~p"/api/recordings", %{
        "audio" => upload,
        "duration_ms" => "1500",
        "title" => "Recording 07 Aug 2026, 05:30 IST"
      })

    assert %{
             "data" => %{
               "id" => id,
               "mime_type" => "audio/webm",
               "duration_ms" => 1500,
               "title" => "Recording 07 Aug 2026, 05:30 IST"
             }
           } = json_response(conn, 201)

    conn = get(build_conn(), ~p"/api/recordings/#{id}/audio")
    assert conn.status == 200
    assert conn.resp_body == "audio bytes"
    assert ["audio/webm; charset=utf-8"] = get_resp_header(conn, "content-type")
  end
end
