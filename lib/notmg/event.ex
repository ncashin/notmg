defmodule Notmg.Event do
  @derive Jason.Encoder
  defstruct [:type, :data]
end
