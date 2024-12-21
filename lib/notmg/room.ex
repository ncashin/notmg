defmodule Notmg.Room do
  use GenServer
  alias NotmgWeb.{Presence, Endpoint}
  require Logger

  @tick_rate 100

  def tick_rate, do: @tick_rate

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, room_id, name: via_tuple(room_id))
  end

  def join(room_id, player_id) do
    GenServer.call(via_tuple(room_id), {:join, player_id})
  end

  def update(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:update, player_id, payload})
  end

  def get_state(room_id) do
    GenServer.call(via_tuple(room_id), :get_state)
  end

  @impl true
  @spec init(any()) :: {:ok, %{players: %{}, room_id: any()}}
  def init(room_id) do
    Logger.info("Starting room #{room_id}")

    Endpoint.subscribe(room_key(room_id))

    :timer.send_interval(@tick_rate, :tick)
    {:ok, %{room_id: room_id, players: %{}}}
  end

  @impl true
  def handle_call({:join, player_id}, _from, state) do
    player = %{
      x: 0,
      y: 0,
      velocity_x: 0,
      velocity_y: 0
    }

    state = put_in(state.players[player_id], player)
    {:reply, {:ok, player}, state}
  end

  @impl true
  def handle_call({:update, player_id, payload}, _from, state) do
    state = put_in(state.players[player_id], payload)
    {:reply, {:ok, payload}, state}
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_info(:tick, state) do
    players = Enum.map(state.players, fn {player_id, player} ->
      player = %{
        player |
        x: player.x + player.velocity_x,
        y: player.y + player.velocity_y
      }
      {player_id, player}
    end)
    |> Map.new()

    state = %{state | players: players}

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
end
