defmodule Mix.Tasks.LdtkTest do
  use Mix.Task

  @impl Mix.Task
  def run(_args) do
    maps = Notmg.Maps.load_maps()

    Notmg.Maps.get_map(maps, "lobby") |> IO.inspect()
  end
end
