# Contributing to TrueWear

Thank you for your interest in contributing to **TrueWear**! We welcome engineers, data scientists, and developers of all backgrounds.

## Code of Conduct
Please be respectful, constructive, and collaborative in all discussions and pull requests.

## How Can You Contribute?
* **Physics & ML Modeling**: Improve wear non-linear equations, tire carcass thermal gradients, or compound degradation models.
* **Circuits & Telemetry**: Add sector vectors and DRS zones for new FIA tracks (Suzuka, Zandvoort, Monaco, etc.).
* **Frontend HUD & Visualizations**: Enhance telemetry widgets, micro-sector delta graphs, or driver interval views.
* **Testing & Documentation**: Add unit tests or expand architectural explainers.

## Pull Request Process
1. Fork the repo and create your branch from main:
   `ash
   git checkout -b feature/your-feature-name
   `
2. Make your edits and ensure typechecking passes:
   `ash
   npm run lint
   npm run build
   `
3. Commit using conventional commit messages (eat:, ix:, docs:, efactor:).
4. Push to your fork and submit a Pull Request with a clear description and screenshots where appropriate.
