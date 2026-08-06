defmodule Timbre.Recordings.Storage do
  @moduledoc false

  def put(storage_key, contents) when is_binary(contents) do
    with {:ok, path} <- path_for(storage_key),
         :ok <- File.mkdir_p(Path.dirname(path)) do
      File.write(path, contents)
    end
  end

  def read(storage_key) do
    with {:ok, path} <- path_for(storage_key) do
      case File.read(path) do
        {:error, :enoent} -> {:error, :not_found}
        result -> result
      end
    end
  end

  def delete(storage_key) do
    with {:ok, path} <- path_for(storage_key) do
      case File.rm(path) do
        {:error, :enoent} -> {:error, :not_found}
        result -> result
      end
    end
  end

  defp path_for(storage_key) when is_binary(storage_key) do
    if Path.basename(storage_key) == storage_key and storage_key != "" do
      {:ok, Path.join(Application.fetch_env!(:timbre, :recordings_storage_path), storage_key)}
    else
      {:error, :invalid_storage_key}
    end
  end
end
