defmodule Timbre.Recordings.StorageTest do
  use ExUnit.Case, async: false

  alias Timbre.Recordings.Storage

  setup do
    root = Path.join(System.tmp_dir!(), "timbre-storage-#{System.unique_integer([:positive])}")
    previous = Application.get_env(:timbre, :recordings_storage_path)
    Application.put_env(:timbre, :recordings_storage_path, root)

    on_exit(fn ->
      File.rm_rf(root)
      Application.put_env(:timbre, :recordings_storage_path, previous)
    end)

    :ok
  end

  test "writes, reads, and deletes a recording file" do
    assert :ok = Storage.put("abc.webm", "audio")
    assert {:ok, "audio"} = Storage.read("abc.webm")
    assert :ok = Storage.delete("abc.webm")
    assert {:error, :not_found} = Storage.read("abc.webm")
  end
end
