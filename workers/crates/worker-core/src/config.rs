#[derive(Debug, Clone)]
pub struct Config {
    pub kafka_bootstrap_servers: String,
    pub database_url: String,
    pub redis_url: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            kafka_bootstrap_servers: std::env::var("KAFKA_BOOTSTRAP_SERVERS")
                .unwrap_or_else(|_| "localhost:29092".to_string()),
            // Puerto host 55432 (no 5432): ver docker-compose.yml, remapeado
            // porque 5432 suele estar ocupado por instalaciones nativas de
            // Postgres. Este binario no lee .env (no hay dotenvy en las
            // dependencias) — si corrés el worker en el host, exportá
            // DATABASE_URL vos mismo o este default ya viene alineado.
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://aurapro:aurapro@localhost:55432/aurapro".to_string()),
            redis_url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379/0".to_string()),
        })
    }
}
