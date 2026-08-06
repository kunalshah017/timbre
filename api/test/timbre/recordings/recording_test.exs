defmodule Timbre.Recordings.RecordingTest do
  use ExUnit.Case, async: true

  alias Timbre.Recordings.Recording

  test "changeset requires core recording metadata" do
    changeset = Recording.changeset(%Recording{}, %{})

    refute changeset.valid?
    assert {"can't be blank", [validation: :required]} = changeset.errors[:title]
    assert {"can't be blank", [validation: :required]} = changeset.errors[:mime_type]
    assert {"can't be blank", [validation: :required]} = changeset.errors[:storage_key]
  end
end
