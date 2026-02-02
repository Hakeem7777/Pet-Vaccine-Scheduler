// Dashboard Tour Steps - shown to authenticated users on first login
export const DASHBOARD_TOUR_STEPS = [
  {
    // Targets both inline form (no dogs) and Add Dog button (has dogs) using CSS selector
    selector: '[data-tour="first-dog-form"], [data-tour="add-dog-btn"]',
    content: {
      title: 'Add Your Dog',
      description: "Start by adding your dog's information. Enter their name, birth date, and living environment to get personalized vaccine recommendations.",
    },
    position: 'left',
  },
  {
    selector: '[data-tour="upload-doc-btn"]',
    content: {
      title: 'Upload Vaccination Records',
      description: 'Have existing records? Upload them here and our AI will automatically extract vaccination history from your documents.',
    },
    position: 'bottom',
  },
  {
    selector: '[data-tour="dog-list"]',
    content: {
      title: 'Your Dogs',
      description: 'All your registered dogs appear here. Click on any dog card to view their detailed vaccination schedule and history.',
    },
    position: 'top',
  },
  {
    selector: '[data-tour="chat-bubble"]',
    content: {
      title: 'AI Vaccine Assistant',
      description: 'Have questions about vaccines? Our AI assistant is available 24/7 to answer your vaccination questions and provide personalized recommendations.',
    },
    position: 'left',
  },
  {
    selector: '[data-tour="faq-link"]',
    content: {
      title: 'Learn More',
      description: 'Visit our FAQ section for detailed information about core vs non-core vaccines, disease prevention, and common vaccination questions.',
    },
    position: 'bottom',
  },
];

// Dog Detail Tour Steps - shown when user first visits a dog's detail page
export const DOG_DETAIL_TOUR_STEPS = [
  {
    selector: '[data-tour="dog-info-card"]',
    content: {
      title: 'Dog Profile',
      description: "Here's your dog's profile information. You can edit details or delete the profile using the buttons below.",
    },
    position: 'bottom',
  },
  {
    selector: '[data-tour="noncore-selector"]',
    content: {
      title: 'Optional Vaccines',
      description: "Select optional vaccines based on your dog's lifestyle. We've pre-selected recommendations based on their environment settings.",
    },
    position: 'bottom',
  },
  {
    selector: '[data-tour="schedule-categories"]',
    content: {
      title: 'Vaccination Schedule',
      description: 'Vaccines are organized by urgency: Overdue (red), Upcoming within 30 days (orange), and Future (green). Stay on top of the red and orange items!',
    },
    position: 'top',
  },
  {
    selector: '[data-tour="schedule-item"]',
    content: {
      title: 'Vaccine Details',
      description: 'Each vaccine card shows the due date and status. Tap the card to flip it and see safety information about the vaccine.',
    },
    position: 'top',
  },
  {
    selector: '[data-tour="mark-done-btn"]',
    content: {
      title: 'Record Vaccinations',
      description: "When your dog receives a vaccine, click 'Mark as Done' to log it. This updates the schedule and calculates the next due date.",
    },
    position: 'top',
  },
  {
    selector: '[data-tour="export-btn"]',
    content: {
      title: 'Export Schedule',
      description: 'Export your vaccination schedule to Apple Calendar, Google Calendar, PDF, or share it via email with your vet or family members.',
    },
    position: 'left',
  },
  {
    selector: '[data-tour="chat-bubble"]',
    content: {
      title: 'Context-Aware AI',
      description: "The AI assistant now knows about this specific dog. Ask questions like 'When is the next vaccine due?' for personalized answers.",
    },
    position: 'left',
  },
];
