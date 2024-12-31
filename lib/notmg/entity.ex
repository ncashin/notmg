defmodule Notmg.Entity do
  alias Notmg.{Projectile, Enemy, Interactable}
  alias Notmg.Enemy.Leviathan
  alias Notmg.Interactable.Button

  @derive Jason.Encoder
  defstruct [
    :id,
    :editor_iid,
    :type,
    :x,
    :y,
    :radius,
    :collision_mask,
    update_fn: nil,
    interact_fn: nil,
    trigger_fn: nil,
    inventory: nil
  ]

  @collision_mask_none 0b0000
  @collision_mask_player 0b0001
  @collision_mask_enemy 0b0010
  @collision_mask_player_interactable 0b0100

  defmodule Player do
    alias Notmg.Entity

    @derive Jason.Encoder
    defstruct ([
                 max_health: 100,
                 health: 100,
                 chat_messages: [],
                 wip_message: ""
               ] ++
                 Map.keys(%Entity{}))
              |> Enum.reject(&(&1 == :__struct__))

    defmodule ChatMessage do
      @derive Jason.Encoder
      defstruct [:content, :sent_at]

      def new(content) do
        %ChatMessage{
          content: content,
          sent_at: System.system_time(:millisecond)
        }
      end
    end
  end

  defmodule Enemy do
    alias Notmg.Entity

    @derive Jason.Encoder
    defstruct ([
                 :angle,
                 :max_health,
                 :health,
                 :speed,
                 :projectile_speed,
                 :attack_range,
                 :attack_cooldown,
                 :time_since_last_attack,
                 last_think_time: 0
               ] ++
                 Map.keys(%Entity{}))
              |> Enum.reject(&(&1 == :__struct__))
  end

  defmodule Interactable do
    alias Notmg.Entity

    @derive Jason.Encoder
    defstruct ([:triggers] ++ Map.keys(%Entity{})) |> Enum.reject(&(&1 == :__struct__))
  end

  defmodule Spawner do
    alias Notmg.Entity

    @derive Jason.Encoder
    defstruct ([:enemy] ++ Map.keys(%Entity{})) |> Enum.reject(&(&1 == :__struct__))
  end

  def collision_mask_player, do: @collision_mask_player
  def collision_mask_enemy, do: @collision_mask_enemy
  def collision_mask_player_interactable, do: @collision_mask_player_interactable

  def generate_id() do
    Ecto.UUID.generate()
  end

  def calculate_distance(obj1, obj2) do
    :math.sqrt(:math.pow(obj1.x - obj2.x, 2) + :math.pow(obj1.y - obj2.y, 2))
  end

  def circle_collision?(obj1, obj2) do
    Bitwise.band(obj1.collision_mask, obj2.collision_mask) > 0 &&
      calculate_distance(obj1, obj2) < obj1.radius + obj2.radius
  end

  def create_entity(type, x, y, opts \\ [])

  def create_entity(:projectile, x, y, opts) do
    %Projectile{
      id: generate_id(),
      editor_iid: Keyword.get(opts, :editor_iid),
      type: :projectile,
      x: x,
      y: y,
      radius: Keyword.get(opts, :radius, 64),
      radians: Keyword.fetch!(opts, :radians),
      speed: Keyword.fetch!(opts, :speed),
      collision_mask: Keyword.fetch!(opts, :collision_mask),
      update_fn: Keyword.get(opts, :update_fn, &Notmg.Projectile.update_basic_projectile/3),
      lifetime: Keyword.get(opts, :lifetime, 3)
    }
  end

  def create_entity(:leviathan, x, y, opts) do
    %Enemy{
      id: generate_id(),
      editor_iid: Keyword.get(opts, :editor_iid),
      type: :leviathan,
      x: x,
      y: y,
      radius: 48,
      update_fn: &Leviathan.update/3,
      max_health: 50,
      health: 50,
      speed: 150,
      projectile_speed: 500,
      attack_range: 400,
      attack_cooldown: 1000,
      time_since_last_attack: 0,
      collision_mask: @collision_mask_enemy
    }
  end

  def create_entity(:button, x, y, opts) do
    %Interactable{
      id: generate_id(),
      editor_iid: Keyword.get(opts, :editor_iid),
      type: :button,
      x: x,
      y: y,
      radius: Keyword.get(opts, :radius, 64),
      interact_fn: &Button.interact/3,
      triggers: Keyword.fetch!(opts, :triggers),
      collision_mask: Keyword.get(opts, :collision_mask, @collision_mask_player_interactable)
    }
  end

  def create_entity(:spawner, x, y, opts) do
    %Spawner{
      id: generate_id(),
      editor_iid: Keyword.get(opts, :editor_iid),
      type: :spawner,
      x: x,
      y: y,
      radius: Keyword.get(opts, :radius, 32),
      trigger_fn: Keyword.get(opts, :trigger_fn, &Notmg.Spawner.Enemy.trigger/3),
      enemy: Keyword.fetch!(opts, :enemy) |> String.to_atom(),
      collision_mask: @collision_mask_none
    }
  end
end
