# CreateTrackerModal - Component Documentation

## Overview

Modal component for creating new trackers with comprehensive form validation and user-friendly interface.

## Features

- ✅ Full form validation using Zod schema
- ✅ Real-time validation feedback
- ✅ Conditional fields based on data type
- ✅ Optimized with React.memo and useCallback
- ✅ Smooth animations and transitions
- ✅ WCAG 2.1 AA compliant
- ✅ Mobile-first responsive design
- ✅ Comprehensive error handling
- ✅ Tracker limit warnings

## Component Structure

```
CreateTrackerModal (Main Container)
├── Dialog (shadcn/ui)
│   ├── DialogHeader
│   │   └── DialogTitle
│   ├── LimitWarnings (conditional)
│   │   ├── Warning at 80% (yellow)
│   │   └── Error at 100% (red)
│   └── CreateTrackerForm
│       ├── TrackerNameInput
│       ├── DataTypeSelector (4 options)
│       ├── ConditionalFields
│       │   ├── UnitInput (for 'number' type)
│       │   └── ScaleConfigInputs (for 'scale' type)
│       ├── OptionalFields (collapsible)
│       │   ├── ColorPicker
│       │   └── IconSelector
│       └── FormActions
│           ├── CancelButton
│           └── SubmitButton
```

## Usage Example

```tsx
import { useState } from 'react';
import { CreateTrackerModal } from '@/components/trackers/CreateTrackerModal';

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trackerCount, setTrackerCount] = useState(15);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>Create New Tracker</button>

      <CreateTrackerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(tracker) => {
          console.log('Tracker created:', tracker);
          setTrackerCount((prev) => prev + 1);
          setIsModalOpen(false);
        }}
        trackerLimit={50}
        currentTrackerCount={trackerCount}
      />
    </>
  );
}
```

## Props

### CreateTrackerModalProps

| Prop                  | Type                                          | Required | Default | Description                        |
| --------------------- | --------------------------------------------- | -------- | ------- | ---------------------------------- |
| `isOpen`              | `boolean`                                     | Yes      | -       | Controls modal visibility          |
| `onClose`             | `() => void`                                  | Yes      | -       | Callback when modal should close   |
| `onSuccess`           | `(tracker: TrackerDetailResponseDto) => void` | No       | -       | Callback after successful creation |
| `trackerLimit`        | `number`                                      | No       | `50`    | Maximum number of trackers allowed |
| `currentTrackerCount` | `number`                                      | No       | `0`     | Current number of trackers         |

## Data Type Options

### 1. Number (Liczba)

- **Use case**: Numeric values with optional unit
- **Examples**: kilometers, weight, hours
- **Additional field**: `unit` (max 20 characters)
- **Icon**: Hash (#)

### 2. Scale (Skala)

- **Use case**: Rating within a range
- **Examples**: mood (1-10), pain level (1-5)
- **Additional fields**: `min` and `max` values
- **Validation**: min < max
- **Icon**: Gauge

### 3. Boolean (Tak/Nie)

- **Use case**: Simple yes/no tracking
- **Examples**: did exercise, took medication
- **No additional fields**
- **Icon**: ToggleLeft

### 4. Text (Tekst)

- **Use case**: Text notes or comments
- **Examples**: journal entries, observations
- **No additional fields**
- **Icon**: Type

## Validation Rules

### Required Fields

- **name**: 1-100 characters (trimmed)
- **data_type**: One of: 'number', 'scale', 'boolean', 'text'

### Conditional Required Fields

- **config.min** and **config.max**: Required when data_type is 'scale'

### Optional Fields

- **unit**: Max 20 characters (only for 'number' type)
- **color**: Must match regex `/^#[0-9A-Fa-f]{6}$/`
- **icon**: Max 50 characters (Lucide icon name)
- **display_order**: Integer >= 0

## API Integration

### Endpoint

```
POST /api/trackers
```

### Request Body

```json
{
  "name": "Daily Exercise",
  "data_type": "number",
  "unit": "minutes",
  "color": "#3b82f6",
  "icon": "activity"
}
```

### Success Response (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Daily Exercise",
  "data_type": "number",
  "unit": "minutes",
  "config": {},
  "color": "#3b82f6",
  "icon": "activity",
  "display_order": 0,
  "is_active": true,
  "created_at": "2026-01-31T12:00:00Z",
  "updated_at": "2026-01-31T12:00:00Z"
}
```

### Error Responses

| Status | Condition     | Message                                  |
| ------ | ------------- | ---------------------------------------- |
| 400    | Invalid data  | "Nieprawidłowe dane. Sprawdź formularz." |
| 401    | Unauthorized  | "Sesja wygasła. Zaloguj się ponownie."   |
| 403    | Limit reached | "Osiągnięto limit trackerów..."          |
| 500    | Server error  | "Nie udało się utworzyć trackera"        |

## Accessibility Features

### ARIA Labels

- All form inputs have proper labels
- Error messages are associated with inputs using `aria-describedby`
- Invalid fields marked with `aria-invalid`
- Alert regions use proper `role="alert"`

### Keyboard Navigation

- Full keyboard support (Tab, Enter, Escape)
- Focus trap within modal
- Logical tab order
- Enter key submits form
- Escape key closes modal

### Screen Reader Support

- Descriptive labels for all inputs
- Error announcements
- Status updates on form submission
- Warning messages for tracker limits

## Performance Optimizations

### React.memo

- `TrackerNameInput`
- `DataTypeSelector`
- `OptionalFields`

### useCallback

- `handleDataTypeChange` - Prevents re-creation on every render

### Conditional Rendering

- Fields rendered only when needed based on data type
- Automatic cleanup when type changes

## Animations

### Entry Animations

- Modal: Default dialog animation from shadcn/ui
- Error alert: `fade-in-50 slide-in-from-top-2`
- Conditional fields: `fade-in-50 duration-300`

### Interaction Animations

- Data type cards: `hover:scale-[1.02]`
- Collapsible: Smooth expand/collapse
- Color picker: Live preview update

## Testing Checklist

### Functional Tests

- [ ] Form submits with valid data
- [ ] Validation errors display correctly
- [ ] Required fields are enforced
- [ ] Min < Max validation for scale type
- [ ] Unit field only shows for 'number' type
- [ ] Scale config only shows for 'scale' type
- [ ] Color picker accepts hex values
- [ ] Form resets on successful submission
- [ ] Modal closes on cancel
- [ ] Modal closes on success

### Accessibility Tests

- [ ] Tab navigation works correctly
- [ ] Screen reader announces errors
- [ ] Focus management works
- [ ] ARIA labels are present
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard shortcuts work

### Responsive Tests

- [ ] Mobile layout (< 640px)
- [ ] Tablet layout (640px - 1024px)
- [ ] Desktop layout (> 1024px)
- [ ] Touch targets are 44x44px minimum

### Error Handling Tests

- [ ] Network errors display message
- [ ] API errors display appropriate message
- [ ] Limit warning shows at 80%
- [ ] Limit error shows at 100%
- [ ] Form disabled when at limit

## Browser Support

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Known Limitations

1. Icon selector is text input only (no visual picker)
2. Color picker native browser implementation varies
3. No inline preview of selected color in cards
4. No autocomplete for unit field

## Future Improvements

1. Visual icon picker with search
2. Predefined color palette
3. Unit autocomplete with common suggestions
4. Tracker templates for quick setup
5. Duplicate tracker functionality
6. Preview of tracker card before creation
