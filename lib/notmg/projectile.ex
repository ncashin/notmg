defmodule Notmg.Projectile do
  alias Notmg.Entity

  @derive Jason.Encoder
  defstruct ([:shooter_id, :radians, :speed, creation_time: nil] ++
               Map.keys(%Entity{}))
            |> Enum.reject(&(&1 == :__struct__))
end
