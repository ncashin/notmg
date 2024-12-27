defimpl Jason.Encoder, for: PID do
  def encode(pid, opts) when is_pid(pid) do
    Jason.Encode.string(inspect(pid), opts)
  end
end

defimpl Jason.Encoder, for: Function do
  def encode(fun, opts) do
    Jason.Encode.string(inspect(fun), opts)
  end
end