defmodule Notmg.Room do
  use GenServer
  alias Notmg.{Player, Enemy, Projectile}
  alias NotmgWeb.Endpoint
  require Logger

  @tick_rate 32

  def tick_rate, do: @tick_rate

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, room_id, name: via_tuple(room_id))
  end

  def join(room_id, player_id) do
    GenServer.call(via_tuple(room_id), {:join, player_id})
  end

  def update_player(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:update_player, player_id, payload})
  end

  def update_enemy(room_id, enemy) do
    GenServer.call(via_tuple(room_id), {:update_enemy, enemy})
  end

  def shoot(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:shoot, player_id, payload})
  end

  def get_state(room_id) do
    GenServer.call(via_tuple(room_id), :get_state)
  end

  @impl true
  def init(room_id) do
    Logger.info("Starting room #{room_id}")

    enemy_id = "test_gremlin"

    enemy = %Enemy{
      id: enemy_id,
      type: :leviathan,
      max_health: 50,
      health: 50,
      x: 400,
      y: 400,
      radius: 64,
      velocity_x: 0,
      velocity_y: 0
    }

    {:ok, enemy_ai_pid} = Notmg.EnemyAI.start_link(enemy_id, enemy, room_id)

    enemy = %{enemy | ai_pid: enemy_ai_pid}

    Endpoint.subscribe(room_key(room_id))

    :timer.send_interval(@tick_rate, :tick)

    {:ok,
     %{
       room_id: room_id,
       players: %{},
       projectiles: %{},
       enemies: %{
         enemy_id => enemy
       }
     }}
  end

  @impl true
  def handle_call({:join, player_id}, _from, state) do
    player = %Player{
      id: player_id,
      max_health: 100,
      health: 100,
      x: 0,
      y: 0,
      radius: 48,
      velocity_x: 0,
      velocity_y: 0
    }

    state = put_in(state.players[player_id], player)
    {:reply, {:ok, player}, state}
  end

  @impl true
  def handle_call({:update_player, player_id, payload}, _from, state) do
    player = get_in(state.players, [player_id])

    player = %Player{
      player
      | x: payload["x"],
        y: payload["y"],
        velocity_x: payload["velocity_x"],
        velocity_y: payload["velocity_y"]
    }

    state = put_in(state.players[player_id], player)
    {:reply, {:ok, payload}, state}
  end

  @impl true
  def handle_call({:update_enemy, updated_enemy}, _from, state) do
    enemy_id = updated_enemy.id
    case state.enemies[enemy_id] do
      nil ->
        {:reply, {:ok, nil}, state}
      enemy ->
        enemy = %{enemy |
          velocity_x: updated_enemy.velocity_x,
          velocity_y: updated_enemy.velocity_y,
          x: updated_enemy.x,
          y: updated_enemy.y
        }
        state = put_in(state.enemies[enemy_id], enemy)
        {:reply, {:ok, nil}, state}
    end
  end

  @impl true
  def handle_call({:shoot, player_id, payload}, _from, state) do
    player = get_in(state.players, [player_id])

    radians = payload["radians"]
    speed = 500

    projectile_id = :crypto.strong_rand_bytes(16) |> Base.encode64()

    projectile = %Projectile{
      id: projectile_id,
      creation_time: System.system_time(:second),
      x: player.x,
      y: player.y,
      radius: 16,
      velocity_x: :math.cos(radians) * speed,
      velocity_y: :math.sin(radians) * speed
    }

    state = put_in(state.projectiles[projectile_id], projectile)

    {:reply, {:ok, projectile_id}, state}
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
        projectile = %Projectile{
          projectile
          | x: projectile.x + projectile.velocity_x * delta_time,
            y: projectile.y + projectile.velocity_y * delta_time
        }

        {projectile_id, projectile}
      end)
      |> Enum.filter(fn {_projectile_id, projectile} ->
        projectile.creation_time + 3 > System.system_time(:second)
      end)
      |> Map.new()

    enemies =
      Enum.map(state.enemies, fn {enemy_id, enemy} ->
        enemy =
          Enum.reduce(projectiles, enemy, fn {_projectile_id, projectile}, acc_enemy ->
            if circle_collision?(projectile, acc_enemy) do
              %Enemy{acc_enemy | health: acc_enemy.health - 5}
            else
              acc_enemy
            end
          end)

        {enemy_id, enemy}
      end)
      |> Enum.filter(fn {_enemy_id, enemy} ->
        if enemy.health <= 0 do
          Logger.info("Stopping enemy AI for #{enemy.id}")
          Notmg.EnemyAI.stop(enemy.id)
          false
        else
          true
        end
      end)
      |> Map.new()

    projectiles =
      Enum.filter(projectiles, fn {_projectile_id, projectile} ->
        not Enum.any?(enemies, fn {_enemy_id, enemy} ->
          circle_collision?(projectile, enemy)
        end)
      end)
      |> Map.new()

    state = %{state | projectiles: projectiles, enemies: enemies}

    Endpoint.broadcast!(room_key(state.room_id), "state", state)
    {:noreply, state}
  end

  @impl true
  def handle_info(%{event: "presence_diff", payload: %{joins: _, leaves: leaves}}, state) do
    players =
      Enum.filter(state.players, fn {player_id, _player} ->
        not Map.has_key?(leaves, player_id)
      end)
      |> Map.new()

    {:noreply, %{state | players: players}}
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
