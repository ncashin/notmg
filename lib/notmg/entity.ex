defmodule Notmg.Entity do
  @derive Jason.Encoder
  defstruct x: 0, y: 0, radius: 0, velocity_x: 0, velocity_y: 0

  def generate_id() do
    :crypto.strong_rand_bytes(16) |> Base.encode64()
  end
end
