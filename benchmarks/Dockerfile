FROM python:3.14.5-slim-trixie@sha256:c845af9399020c7e562969a13689e929074a10fd057acd1b1fad06a2fb068e97

COPY --from=node:26.11.1-trixie-slim@sha256:193fe51b64e77981119c98c2002c9e32a70e2f006fb4d25068ce0558998917f0 /usr/local/bin/node /usr/local/bin/node
COPY --from=rust:1.99.1-slim-trixie@sha256:7eab7ce19273ce785e0ca7578bdf7bc1fcbae621775a8197379a04c9f6e03cd5 /usr/local/rustup /usr/local/rustup
COPY --from=rust:1.99.1-slim-trixie@sha256:7eab7ce19273ce785e0ca7578bdf7bc1fcbae621775a8197379a04c9f6e03cd5 /usr/local/cargo /usr/local/cargo

ENV RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo PATH=/usr/local/cargo/bin:$PATH CARGO_TARGET_DIR=/opt/target

RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev valgrind && rm -rf /var/lib/apt/lists/*

WORKDIR /work
COPY . .

RUN cargo build --release --locked && python -m pip install --no-cache-dir ./python
