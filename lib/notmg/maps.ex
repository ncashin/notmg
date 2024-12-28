defmodule Notmg.Maps do
  @assets_path Path.join([Path.dirname(__ENV__.file), "..", "..", "assets", "map.ldtk"])

  def load_map(path) do
    path
    |> File.read!()
    |> Ldtk.Root.from_json()
    |> ldtk_root_to_maps()
  end

  def load_map() do
    load_map(@assets_path)
  end

  def ldtk_root_to_maps(ldtk_root) do
    for level <- ldtk_root.levels do
      %{
        name: level.identifier,
        width: level.px_wid,
        height: level.px_hei,
        world_x: level.world_x,
        world_y: level.world_y,
        layer_names: Enum.map(level.layer_instances, & &1.identifier),
      }
    end
  end

  def get_map(room_id) do
    load_map()
    |> Enum.find(& &1.name == room_id)
  end
end
