defmodule Timbre.Repo.Migrations.CreateRecordings do
  use Ecto.Migration

  def change do
    create table(:recordings) do
      add :title, :string, null: false
      add :mime_type, :string, null: false
      add :extension, :string, null: false
      add :size_bytes, :bigint, null: false
      add :duration_ms, :integer, null: false
      add :storage_key, :string, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:recordings, [:storage_key])
    create index(:recordings, [:inserted_at])
  end
end
