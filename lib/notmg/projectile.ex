defmodule Notmg.Projectile do
  alias Notmg.Entity

  @derive Jason.Encoder
  defstruct [:id, creation_time: nil] ++ Map.keys(%Entity{})
end
