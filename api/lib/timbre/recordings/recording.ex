defmodule Timbre.Recordings.Recording do
  use Ecto.Schema

  import Ecto.Changeset

  @allowed_mime_types ["audio/webm", "audio/mp4"]
  @allowed_extensions ["webm", "mp4"]
  @max_duration_ms 10 * 60 * 1_000
  @max_size_bytes 50 * 1_024 * 1_024

  schema "recordings" do
    field(:title, :string)
    field(:mime_type, :string)
    field(:extension, :string)
    field(:size_bytes, :integer)
    field(:duration_ms, :integer)
    field(:storage_key, :string)

    timestamps(type: :utc_datetime)
  end

  def changeset(recording, attrs) do
    recording
    |> cast(attrs, [:title, :mime_type, :extension, :size_bytes, :duration_ms, :storage_key])
    |> validate_required([
      :title,
      :mime_type,
      :extension,
      :size_bytes,
      :duration_ms,
      :storage_key
    ])
    |> validate_length(:title, min: 1, max: 200)
    |> validate_inclusion(:mime_type, @allowed_mime_types)
    |> validate_inclusion(:extension, @allowed_extensions)
    |> validate_number(:size_bytes, greater_than: 0, less_than_or_equal_to: @max_size_bytes)
    |> validate_number(:duration_ms,
      greater_than_or_equal_to: 0,
      less_than_or_equal_to: @max_duration_ms
    )
    |> unique_constraint(:storage_key)
  end
end
