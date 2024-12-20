defmodule Notmg.Repo do
  use Ecto.Repo,
    otp_app: :notmg,
    adapter: Ecto.Adapters.SQLite3
end
