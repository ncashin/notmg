defmodule Notmg.Maps do
  @assets_path Path.join([Path.dirname(__ENV__.file), "..", "..", "assets", "map.ldtk"])

  @map_scale 2.5
  defmodule MapEntity do
    @derive Jason.Encoder
    defstruct name: nil, world_x: nil, world_y: nil
  end

  defmodule Map do
    @derive Jason.Encoder
    defstruct name: nil,
              width: nil,
              height: nil,
              world_x: nil,
              world_y: nil,
              layer_names: [],
              entities: []
  end

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
      entities =
        case Enum.find(level.layer_instances, &(&1.identifier == "entities")) do
          nil ->
            []

          entity_layer ->
            for entity <- entity_layer.entity_instances do
              %MapEntity{
                name: entity.identifier |> String.to_atom(),
                world_x: entity.world_x * @map_scale,
                world_y: entity.world_y * @map_scale
              }
            end
        end

      %Map{
        name: level.identifier,
        width: level.px_wid * @map_scale,
        height: level.px_hei * @map_scale,
        world_x: level.world_x * @map_scale,
        world_y: level.world_y * @map_scale,
        layer_names: Enum.map(level.layer_instances, & &1.identifier),
        entities: entities
      }
    end
  end

  def get_map(room_id) do
    load_map()
    |> Enum.find(&(&1.name == room_id))
  end
end
