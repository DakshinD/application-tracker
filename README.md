# Job Application Tracker

A clean, interactive dashboard to track and visualize your job applications. Perfect for managing your job search process from application to offer.


## Features

- **Application Tracking**: Log and manage all your job applications in one place
- **Status Timeline**: Visual timeline showing each application's progress through various stages
- **Statistics Dashboard**: Get insights into your application success rates
- **Data Visualization**: Sankey diagram showing the flow of applications through different stages
- **Data Import/Export**: Backup and restore your data anytime
- **Responsive Design**: Works on desktop and mobile devices
- **Local Storage**: All data is stored in your browser's localStorage (no server needed)

## Deployment on Vercel

You can deploy your own instance of this application to Vercel in just a few steps:

### Prerequisites

- GitHub, GitLab, or Bitbucket account
- Vercel account (can sign up with your GitHub account)

### Steps to Deploy

1. **Fork this repository**
   - Click the "Fork" button at the top right of this GitHub repository

2. **Deploy to Vercel**
   - Go to [Vercel](https://vercel.com/)
   - Sign up or log in (you can use your GitHub account)
   - Click "Add New..." > "Project"
   - Select your forked repository
   - Vercel will automatically detect it as a Next.js project
   - Configure your project:
     - Framework Preset: Next.js
     - Root Directory: `./`
     - Build Command: `next build`
     - Output Directory: `.next`
   - Click "Deploy"

3. **Access Your App**
   - Once deployment is complete, Vercel will provide you with a URL
   - Your job tracker is now live at that URL
   - You can also set up a custom domain in Vercel settings if desired

### Setting Up Development Environment Locally

If you want to run the app locally or make modifications:

1. **Clone your forked repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/job-application-tracker.git
   cd job-application-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to http://localhost:3000
   - You should see the job tracker application running

## Using the Application

1. **Adding Applications**
   - Click the "+ Add Application" button
   - Fill in details about the job (company, position, etc.)
   - The application will be added to your tracker with "Applied" status

2. **Updating Application Status**
   - Click on an application row to expand it
   - Use the "Add Stage" button to add new stages to the timeline
   - Stages include: Applied, Online Assessment, Phone, Behavioral, Technical, Final, Offer, etc.

3. **Data Management**
   - Use the "Export" button to save your data as a JSON file
   - Use the "Import" button to restore from a previously exported file

## Customization

You can customize various aspects of the application:

- **Colors**: Edit the styling in the corresponding components
- **Status Types**: Modify the ApplicationStatus type in src/app/page.tsx
- **Layout**: Adjust the grid layout in the main component

## Privacy

This application stores all data in your browser's localStorage. No data is sent to any server.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgements

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Data visualization with [Nivo](https://nivo.rocks/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
