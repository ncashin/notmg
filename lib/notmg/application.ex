defmodule Notmg.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      NotmgWeb.Telemetry,
      Notmg.Repo,
      {Ecto.Migrator,
       repos: Application.fetch_env!(:notmg, :ecto_repos), skip: skip_migrations?()},
      {DNSCluster, query: Application.get_env(:notmg, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Notmg.PubSub},
      # Start a worker by calling: Notmg.Worker.start_link(arg)
      # {Notmg.Worker, arg},
      # Start to serve requests, typically the last entry
      NotmgWeb.Endpoint,
      {Registry, keys: :unique, name: Notmg.RoomRegistry},
      {Registry, keys: :unique, name: Notmg.EnemyRegistry},
      {DynamicSupervisor, strategy: :one_for_one, name: Notmg.RoomSupervisor},
      NotmgWeb.Presence
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Notmg.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    NotmgWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp skip_migrations?() do
    # By default, sqlite migrations are run when using a release
    System.get_env("RELEASE_NAME") != nil
  end
end
