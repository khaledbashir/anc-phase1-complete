[![Discord](https://img.shields.io/badge/Discord-%40Invoify-000000?style=flat&logo=Discord&logoColor=#5865F2)](https://discord.gg/uhXKHbVKHZ)
# Invoify

Invoify is a web-based proposal generator application built with Next.js 13, TypeScript, React, and the Shadcn UI library. It provides an easy way to create and manage professional proposals.

![Invoify Website image](/public/assets/img/invoify-web-app.png)

## Table of Contents

- [Invoify](#invoify)
  - [Table of Contents](#table-of-contents)
  - [Technologies](#technologies)
    - [Core Technologies](#core-technologies)
    - [Additional Dependencies](#additional-dependencies)
  - [Roadmap](#roadmap)
  - [Demo](#demo)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [License](#license)


## Technologies

### Core Technologies

- **Next.js:** React framework for SSR and client-side navigation.
- **TypeScript:** JavaScript superset with static typing.
- **Shadcn-UI:** UI library for enhanced visuals.
- **Tailwind:** Utility-first CSS framework.
- **React Hook Form:** Form management for React.
- **Zod:** TypeScript-first schema validation.
- **Puppeteer:** PDF generation with headless browsers.

### Additional Dependencies

- **Nodemailer:** Node.js module for sending emails.
- **Lucide Icons:** Collection of customizable SVG icons.

## Roadmap

- [x] **Easily Create Proposals:** Utilize a simple form to quickly generate proposals.
- [x] **Save for Future Access:** Store your proposals directly in your browser for easy retrieval.
- [x] **Retrieve Proposals Effortlessly:** Load and access proposals seamlessly from your saved list.
- [x] **Flexible Download Options:** Download proposals directly or send them via email in PDF format.
- [x] **Template Variety:** Choose from multiple (currently 2) proposal templates.
- [x] **Live Preview:** Edit the form and see changes in real-time with the live preview feature.
- [x] **Export in Various Formats:** Export proposals in different formats, including JSON, XLSX, CSV, and XML.
- [ ] **I18N Support:** i18n support with multiple languages for UI and templates.
- [ ] **Themeable Templates:** Select a theme color for the proposal
- [ ] **Custom Inputs:** Define your own inputs that are missing from the default proposal builder. (Ex: VAT number)
- [ ] **Individual Tax for Line Items:** Add tax details for a specific line item other than the general tax

## Demo

> [!NOTE]
> Please be advised that there are currently issues when using this application in the Mozilla Firefox browser. For more information, refer to [Issue #11](https://github.com/aliabb01/invoify/issues/11).

Visit the [live demo](https://invoify.vercel.app) to see Invoify in action.

## Getting Started

Follow these instructions to get Invoify up and running on your local machine.

### Prerequisites

- Node.js and npm installed on your system.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/al1abb/invoify.git
   cd invoify
   ```
2. Install dependencies
   
   ```bash
   npm install
   ```
3. Create an .env.local file with this content (This step is for sending pdf to email feature):
   ```env
   NODEMAILER_EMAIL=your_email@example.com
   NODEMAILER_PW=your_email_password
   ```
4. Start development server

    ```bash
    npm run dev
    ```
5. Open your web browser and access the application at [http://localhost:3000](http://localhost:3000)
<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

## Discord
Join the Discord server [here](https://discord.gg/uhXKHbVKHZ)
