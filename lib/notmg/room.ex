defmodule Notmg.Room do
  use GenServer
  alias Notmg.{Player, Enemy, Projectile, Entity, Inventory}
  alias NotmgWeb.Endpoint
  require Logger

  @tick_rate 32
  @enemy_spawn_rate 1000 * 3

  def tick_rate, do: @tick_rate

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, room_id, name: via_tuple(room_id))
  end

  def join(room_id, player_id) do
    GenServer.call(via_tuple(room_id), {:join, player_id})
  end

  def update_player(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:update_entity_player, player_id, payload})
  end

  def update_enemy(room_id, enemy) do
    GenServer.call(via_tuple(room_id), {:update_entity_server, enemy})
  end

  def shoot(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:shoot, player_id, payload})
  end

  def interact(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:interact, player_id, payload})
  end

  def get_state(room_id) do
    GenServer.call(via_tuple(room_id), :get_state)
  end

  def create_enemy(room_id, x, y) do
    enemy_id = Entity.generate_id()

    enemy = %Enemy{
      id: enemy_id,
      type: :leviathan,
      ai: Notmg.EnemyAI,
      max_health: 50,
      health: 50,
      x: x,
      y: y,
      radius: 48
    }

    {:ok, enemy_ai_pid} = apply(enemy.ai, :start_link, [enemy_id, enemy, room_id])

    %{enemy | ai_pid: enemy_ai_pid}
  end

  @impl true
  def init(room_id) do
    Logger.info("Starting room #{room_id}")

    Endpoint.subscribe(room_key(room_id))

    :timer.send_interval(@tick_rate, :tick)
    :timer.send_interval(@enemy_spawn_rate, :spawn_enemy)

    button_id = Entity.generate_id()

    button = %{
      id: button_id,
      type: :button,
      ai: nil,
      x: 0,
      y: 0,
      radius: 400,
      health: 0,
      max_health: 1
    }

    {:ok,
     %{
       room_id: room_id,
       entities: %{button_id => button},
       projectiles: %{}
     }}
  end

  @impl true
  def handle_call({:join, player_id}, _from, state) do
    player = %Player{
      id: player_id,
      type: :player,
      ai: nil,
      max_health: 100,
      health: 100,
      x: 0,
      y: 0,
      radius: 24,
      inventory: Inventory.new() |> Inventory.populate_with_test_data()
    }

    state = put_in(state.entities[player_id], player)
    {:reply, {:ok, player}, state}
  end

  @impl true
  def handle_call({:update_entity_player, player_id, payload}, _from, state) do
    player = get_in(state.entities, [player_id])

    player = %Player{
      player
      | x: payload["x"],
        y: payload["y"]
    }

    state = put_in(state.entities[player_id], player)
    {:reply, {:ok, payload}, state}
  end

  @impl true
  def handle_call({:update_entity_server, updated_enemy}, _from, state) do
    enemy_id = updated_enemy.id

    case state.entities[enemy_id] do
      nil ->
        {:reply, {:ok, nil}, state}

      enemy ->
        enemy = %{enemy | x: updated_enemy.x, y: updated_enemy.y}
        state = put_in(state.entities[enemy_id], enemy)
        {:reply, {:ok, nil}, state}
    end
  end

  @impl true
  def handle_call({:shoot, player_id, payload}, _from, state) do
    player = get_in(state.entities, [player_id])

    radians = payload["radians"]

    projectile_id = Entity.generate_id()

    projectile = %Projectile{
      id: projectile_id,
      shooter_id: player_id,
      creation_time: System.system_time(:second),
      x: player.x,
      y: player.y,
      radius: 16,
      radians: radians,
      speed: 500
    }

    state = put_in(state.projectiles[projectile_id], projectile)

    {:reply, {:ok, projectile_id}, state}
  end

  @impl true
  def handle_call({:interact, player_id, payload}, _from, state) do
    interact_id = payload["interact_id"]
    player = get_in(state.entities, [player_id])
    interactable = get_in(state.entities, [interact_id])

    if circle_collision?(player, interactable) do
      enemy = create_enemy(state.room_id, interactable.x, interactable.y)
      state = put_in(state.entities[enemy.id], enemy)
      {:reply, {:ok, interact_id}, state}
    else
      {:reply, {:ok, interact_id}, state}
    end
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_info(:tick, state) do
    delta_time = 1 / @tick_rate

    projectiles =
      Enum.map(state.projectiles, fn {projectile_id, projectile} ->
        velocity_x = :math.cos(projectile.radians) * projectile.speed
        velocity_y = :math.sin(projectile.radians) * projectile.speed

        projectile = %Projectile{
          projectile
          | x: projectile.x + velocity_x * delta_time,
            y: projectile.y + velocity_y * delta_time
        }

        {projectile_id, projectile}
      end)
      |> Enum.filter(fn {_projectile_id, projectile} ->
        projectile.creation_time + 3 > System.system_time(:second)
      end)
      |> Map.new()

    entities =
      Enum.map(state.entities, fn {entity_id, entity} ->
        entity =
          Enum.reduce(projectiles, entity, fn {_projectile_id, projectile}, acc_entity ->
            if entity.max_health != nil && projectile.shooter_id != entity_id &&
                 circle_collision?(projectile, acc_entity) do
              %{acc_entity | health: acc_entity.health - 5}
            else
              acc_entity
            end
          end)

        {entity_id, entity}
      end)
      |> Enum.filter(fn {_entity_id, entity} ->
        if entity.health != nil && entity.health <= 0 && entity.ai != nil do
          Logger.info("Stopping enemy AI for #{entity.id}")
          apply(entity.ai, :stop, [entity.id])
          false
        else
          true
        end
      end)
      |> Map.new()

    projectiles =
      Enum.filter(projectiles, fn {_projectile_id, projectile} ->
        not Enum.any?(entities, fn {entity_id, entity} ->
          projectile.shooter_id != entity_id && circle_collision?(projectile, entity)
        end)
      end)
      |> Map.new()

    state = %{state | projectiles: projectiles, entities: entities}

    Endpoint.broadcast!(room_key(state.room_id), "state", state)
    {:noreply, state}
  end

  @impl true
  def handle_info(:spawn_enemy, state) do
    if map_size(state.entities) < 5 do
      enemy = create_enemy(state.room_id, 400, 400)
      state = put_in(state.entities[enemy.id], enemy)
      {:noreply, state}
    else
      Logger.info("Not spawning enemy, too many enemies")
      {:noreply, state}
    end
  end

  @impl true
  def handle_info(%{event: "presence_diff", payload: %{joins: _, leaves: leaves}}, state) do
    entities =
      Enum.filter(state.entities, fn {player_id, _player} ->
        not Map.has_key?(leaves, player_id)
      end)
      |> Map.new()

    {:noreply, %{state | entities: entities}}
  end

  @impl true
  def handle_info(%{topic: "room:" <> _room_id}, state) do
    {:noreply, state}
  end

  defp room_key(room_id) do
    "room:#{room_id}"
  end

  defp via_tuple(room_id) do
    {:via, Registry, {Notmg.RoomRegistry, room_id}}
  end

  defp circle_collision?(obj1, obj2) do
    distance = :math.sqrt(:math.pow(obj1.x - obj2.x, 2) + :math.pow(obj1.y - obj2.y, 2))
    distance < obj1.radius + obj2.radius
  end
end
