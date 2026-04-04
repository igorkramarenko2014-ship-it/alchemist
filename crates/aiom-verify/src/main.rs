use clap::Parser;
use aiom_verify::{AiomIndependentVerifier, VerificationFailure};
use aiom_artifact::SignedArtifact;
use std::fs;
use std::path::PathBuf;

#[derive(clap::Subcommand)]
enum Commands {
    /// Verify a signed artifact structure
    Verify {
        /// Path to the signed artifact JSON
        #[arg(short, long)]
        artifact: PathBuf,
    },
    /// Generate a signed golden fixture for testing
    Generate {
        /// Target path for the generated artifact
        #[arg(short, long)]
        output: PathBuf,
    }
}

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Verify { artifact: path } => {
            // 1. Load artifact
            let data = match fs::read_to_string(&path) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("AIOM-VERIFY: FAILED — could not read artifact: {}", e);
                    std::process::exit(1);
                }
            };

            let artifact: SignedArtifact = match serde_json::from_str(&data) {
                Ok(a) => a,
                Err(e) => {
                    eprintln!("AIOM-VERIFY: FAILED — invalid JSON: {}", e);
                    std::process::exit(1);
                }
            };

            // 2. Perform comprehensive verification
            match AiomIndependentVerifier::verify_artifact(&artifact) {
                Ok(_) => {
                    println!("AIOM-VERIFY: signature=ok");
                    println!("AIOM-VERIFY: chain=ok");
                    println!("AIOM-VERIFY: merkle=ok");
                    println!("AIOM-VERIFY: replay=ok");
                    println!("AIOM-VERIFY: VALID — artifact is trustless-verified");
                    std::process::exit(0);
                }
                Err(e) => {
                    eprintln!("AIOM-VERIFY: FAILED — verification failed: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Commands::Generate { output } => {
            let secret = [0u8; 32]; // Default dev secret
            let artifact = aiom_artifact::ArtifactBuilder::generate_golden_fixture(&secret);
            let json = serde_json::to_string_pretty(&artifact).unwrap();
            
            match fs::create_dir_all(output.parent().unwrap_or(&PathBuf::from("."))) {
                Ok(_) => (),
                Err(e) => {
                    eprintln!("AIOM-VERIFY: FAILED — could not create directory: {}", e);
                    std::process::exit(1);
                }
            }
            
            match fs::write(&output, json) {
                Ok(_) => {
                    println!("AIOM-VERIFY: generated golden fixture at {:?}", output);
                    std::process::exit(0);
                }
                Err(e) => {
                    eprintln!("AIOM-VERIFY: FAILED — could not write artifact: {}", e);
                    std::process::exit(1);
                }
            }
        }
    }
}
