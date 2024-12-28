defmodule Mix.Tasks.LdtkTest do
  use Mix.Task

  @impl Mix.Task
  def run(_args) do
    Notmg.Maps.load_map() |> IO.inspect()
  end
end
