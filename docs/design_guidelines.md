# Design Guidelines for Enterprise AI Application Platform

## Design Approach
**Reference-Based Approach** - Drawing inspiration from enterprise SaaS platforms like Notion, Linear, and Stripe with a focus on trust, professionalism, and conversion optimization for high-growth AI consulting.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Brand Primary: 174 100% 29% (deep turquoise)
- Brand Secondary: 20 100% 50% (vibrant orange for CTAs)
- Dark Mode Background: 220 13% 9% 
- Light Mode Background: 0 0% 98%

**Supporting Colors:**
- Success: 142 76% 36%
- Warning: 38 92% 50%
- Error: 0 84% 60%
- Text Primary: 220 9% 89% (dark mode) / 220 9% 9% (light mode)
- Text Secondary: 220 9% 70% (dark mode) / 220 9% 46% (light mode)

### B. Typography
- **Primary Font**: Inter via Google Fonts CDN
- **Code Font**: JetBrains Mono via Google Fonts CDN
- **Hierarchy**: 
  - Hero: text-5xl font-bold
  - Section Headers: text-3xl font-semibold
  - Subsections: text-xl font-medium
  - Body: text-base font-normal

### C. Layout System
**Spacing Units**: Consistent use of Tailwind units 2, 4, 8, 12, 16, 24
- Micro spacing: p-2, m-2, gap-2
- Standard spacing: p-4, m-4, gap-4  
- Section spacing: p-8, m-8, gap-8
- Large spacing: p-12, m-12, gap-12

### D. Component Library

**Navigation:**
- Clean horizontal navbar with logo, main nav items, and CTA button
- Sidebar navigation for dashboard areas with collapsible sections
- Breadcrumb navigation for deep navigation paths

**Forms:**
- Consistent form styling with floating labels
- Input focus states with turquoise accent borders
- Multi-step forms with progress indicators
- Form validation with inline error messages

**Data Displays:**
- Card-based layouts with subtle shadows and rounded corners
- Table components with sorting, filtering, and pagination
- Interactive charts using modern data visualization
- Template gallery with hover effects and rating displays

**CTAs & Buttons:**
- Primary: Turquoise background with white text
- Secondary: Orange background for high-conversion actions
- Outline variants: Transparent with colored borders
- Ghost buttons: Text-only for secondary actions

**Overlays:**
- Modal dialogs with backdrop blur
- Slide-over panels for detailed views
- Toast notifications positioned top-right
- Loading states with skeleton placeholders

## Marketing/Landing Page Specifications

### Visual Treatment
**Hero Section:**
- Large gradient background: 174 100% 29% to 174 80% 20%
- Powerful headline emphasizing "Zero-Shot AI Application Platform"
- Subtitle highlighting enterprise-grade capabilities
- Primary CTA: "Start Building" (orange button)
- Secondary CTA: "View Templates" (outline button with blur background)

**Color Usage:**
- Strategic turquoise gradients for trust and technology
- Orange accents sparingly for conversion-critical CTAs
- Avoid gold/yellow - stick to turquoise/orange brand palette
- High contrast white text on gradients for readability

**Gradient Applications:**
- Hero background: Subtle turquoise gradient
- Section dividers: Light gradient overlays
- CTA button backgrounds: Orange to deeper orange gradients
- Card hover states: Subtle gradient shifts

**Background Treatments:**
- Clean geometric patterns in very light opacity
- Gradient overlays on feature sections
- Subtle dot grid patterns for technical sections
- Color blocks to separate major sections

### Content Structure (Maximum 4 Sections)
1. **Hero Section**: Value proposition, dual CTAs, trust indicators
2. **Template Gallery Preview**: 3-4 featured industry templates with ratings
3. **Social Proof**: Customer success stories and enterprise logos
4. **Final CTA**: Simple conversion-focused section

### Images
**Hero Image:** Large centered illustration or screenshot of the platform interface showing the template gallery and chat interface - positioned right side of hero text

**Template Previews:** Small thumbnail images (300x200px) showing industry-specific application interfaces for healthcare, finance, and e-commerce templates

**Customer Logos:** Grayscale enterprise client logos arranged in a grid for social proof section

**No stock photos** - focus on product screenshots and custom illustrations that demonstrate platform capabilities.

## Key Design Principles
- **Enterprise Trust**: Professional, clean aesthetic that instills confidence
- **Conversion Optimization**: Strategic color placement and clear visual hierarchy
- **Accessibility**: Consistent dark/light mode support across all components
- **Scalability**: Component system that grows with platform complexity
- **Performance**: Minimal visual effects, focus on fast loading and smooth interactions