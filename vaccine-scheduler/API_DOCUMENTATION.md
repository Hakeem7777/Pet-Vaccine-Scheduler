# Vaccine Scheduler API Documentation

Base URL: `http://localhost:8000/api`

## Table of Contents

1. [Authentication](#authentication)
2. [Dogs (Patients)](#dogs-patients)
3. [Vaccinations](#vaccinations)
4. [Schedule Calculation](#schedule-calculation)
5. [AI Analysis](#ai-analysis)

---

## Authentication

All endpoints (except registration and login) require a JWT Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Register a New User

**Endpoint:** `POST /api/auth/register/`

**Authentication:** None required

**Request Body:**
```json
{
    "username": "drsmith",
    "email": "drsmith@vetclinic.com",
    "password": "SecurePassword123!",
    "password_confirm": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Smith",
    "clinic_name": "Happy Paws Veterinary",
    "phone": "+1-555-123-4567"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Unique username |
| email | string | Yes | Valid email address |
| password | string | Yes | Minimum 8 characters |
| password_confirm | string | Yes | Must match password |
| first_name | string | No | User's first name |
| last_name | string | No | User's last name |
| clinic_name | string | No | Veterinary clinic name |
| phone | string | No | Contact phone number |

**Success Response:** `201 Created`
```json
{
    "user": {
        "id": 1,
        "username": "drsmith",
        "email": "drsmith@vetclinic.com",
        "first_name": "John",
        "last_name": "Smith",
        "clinic_name": "Happy Paws Veterinary",
        "phone": "+1-555-123-4567",
        "date_joined": "2025-12-08T10:30:00Z",
        "created_at": "2025-12-08T10:30:00Z",
        "updated_at": "2025-12-08T10:30:00Z"
    },
    "tokens": {
        "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
}
```

**Error Response:** `400 Bad Request`
```json
{
    "username": ["A user with that username already exists."],
    "password_confirm": ["Passwords do not match."]
}
```

---

### Login

**Endpoint:** `POST /api/auth/login/`

**Authentication:** None required

**Request Body:**
```json
{
    "username": "drsmith",
    "password": "SecurePassword123!"
}
```

**Success Response:** `200 OK`
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Error Response:** `401 Unauthorized`
```json
{
    "detail": "No active account found with the given credentials"
}
```

---

### Refresh Access Token

**Endpoint:** `POST /api/auth/refresh/`

**Authentication:** None required (uses refresh token)

**Request Body:**
```json
{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Success Response:** `200 OK`
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Error Response:** `401 Unauthorized`
```json
{
    "detail": "Token is invalid or expired",
    "code": "token_not_valid"
}
```

---

### Get Current User Profile

**Endpoint:** `GET /api/auth/me/`

**Authentication:** Required

**Success Response:** `200 OK`
```json
{
    "id": 1,
    "username": "drsmith",
    "email": "drsmith@vetclinic.com",
    "first_name": "John",
    "last_name": "Smith",
    "clinic_name": "Happy Paws Veterinary",
    "phone": "+1-555-123-4567",
    "date_joined": "2025-12-08T10:30:00Z",
    "created_at": "2025-12-08T10:30:00Z",
    "updated_at": "2025-12-08T10:30:00Z"
}
```

---

### Update User Profile

**Endpoint:** `PUT /api/auth/me/`

**Authentication:** Required

**Request Body:**
```json
{
    "email": "newemail@vetclinic.com",
    "first_name": "Jonathan",
    "last_name": "Smith",
    "clinic_name": "Happy Paws Veterinary Center",
    "phone": "+1-555-987-6543"
}
```

**Success Response:** `200 OK`
```json
{
    "id": 1,
    "username": "drsmith",
    "email": "newemail@vetclinic.com",
    "first_name": "Jonathan",
    "last_name": "Smith",
    "clinic_name": "Happy Paws Veterinary Center",
    "phone": "+1-555-987-6543",
    "date_joined": "2025-12-08T10:30:00Z",
    "created_at": "2025-12-08T10:30:00Z",
    "updated_at": "2025-12-08T11:00:00Z"
}
```

---

### Change Password

**Endpoint:** `POST /api/auth/password/change/`

**Authentication:** Required

**Request Body:**
```json
{
    "old_password": "SecurePassword123!",
    "new_password": "NewSecurePassword456!",
    "new_password_confirm": "NewSecurePassword456!"
}
```

**Success Response:** `200 OK`
```json
{
    "message": "Password changed successfully."
}
```

**Error Response:** `400 Bad Request`
```json
{
    "old_password": ["Old password is incorrect."]
}
```

---

### Logout

**Endpoint:** `POST /api/auth/logout/`

**Authentication:** Required

**Request Body:**
```json
{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Success Response:** `200 OK`
```json
{
    "message": "Successfully logged out."
}
```

---

## Dogs (Patients)

### List All Dogs

**Endpoint:** `GET /api/dogs/`

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number (default: 1) |

**Success Response:** `200 OK`
```json
{
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 1,
            "name": "Buddy",
            "breed": "Golden Retriever",
            "sex": "MN",
            "sex_display": "Male (Neutered)",
            "birth_date": "2025-10-01",
            "weight_kg": "12.50",
            "age_weeks": 10,
            "age_classification": "puppy",
            "env_indoor_only": false,
            "env_dog_parks": true,
            "env_daycare_boarding": false,
            "env_travel_shows": false,
            "vaccination_count": 3,
            "created_at": "2025-12-08T10:30:00Z",
            "updated_at": "2025-12-08T10:30:00Z"
        },
        {
            "id": 2,
            "name": "Max",
            "breed": "German Shepherd",
            "sex": "M",
            "sex_display": "Male",
            "birth_date": "2023-05-15",
            "weight_kg": "35.00",
            "age_weeks": 134,
            "age_classification": "adult",
            "env_indoor_only": false,
            "env_dog_parks": true,
            "env_daycare_boarding": true,
            "env_travel_shows": false,
            "vaccination_count": 8,
            "created_at": "2025-12-01T09:00:00Z",
            "updated_at": "2025-12-01T09:00:00Z"
        }
    ]
}
```

---

### Create a Dog

**Endpoint:** `POST /api/dogs/`

**Authentication:** Required

**Request Body:**
```json
{
    "name": "Buddy",
    "breed": "Golden Retriever",
    "sex": "MN",
    "birth_date": "2025-10-01",
    "weight_kg": 12.5,
    "env_indoor_only": false,
    "env_dog_parks": true,
    "env_daycare_boarding": false,
    "env_travel_shows": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Dog's name (max 100 chars) |
| breed | string | No | Dog's breed (max 100 chars) |
| sex | string | No | One of: `M`, `F`, `MN`, `FS` |
| birth_date | date | Yes | Format: YYYY-MM-DD |
| weight_kg | decimal | No | Weight in kilograms |
| env_indoor_only | boolean | No | Lives primarily indoors |
| env_dog_parks | boolean | No | Visits dog parks |
| env_daycare_boarding | boolean | No | Attends daycare/boarding |
| env_travel_shows | boolean | No | Travels or participates in shows |

**Sex Options:**
- `M` - Male
- `F` - Female
- `MN` - Male (Neutered)
- `FS` - Female (Spayed)

**Success Response:** `201 Created`
```json
{
    "id": 1,
    "name": "Buddy",
    "breed": "Golden Retriever",
    "sex": "MN",
    "sex_display": "Male (Neutered)",
    "birth_date": "2025-10-01",
    "weight_kg": "12.50",
    "age_weeks": 10,
    "age_classification": "puppy",
    "env_indoor_only": false,
    "env_dog_parks": true,
    "env_daycare_boarding": false,
    "env_travel_shows": false,
    "vaccination_count": 0,
    "created_at": "2025-12-08T10:30:00Z",
    "updated_at": "2025-12-08T10:30:00Z"
}
```

**Error Response:** `400 Bad Request`
```json
{
    "birth_date": ["Birth date cannot be in the future."]
}
```

---

### Get Dog Details

**Endpoint:** `GET /api/dogs/{id}/`

**Authentication:** Required

**Success Response:** `200 OK`
```json
{
    "id": 1,
    "name": "Buddy",
    "breed": "Golden Retriever",
    "sex": "MN",
    "sex_display": "Male (Neutered)",
    "birth_date": "2025-10-01",
    "weight_kg": "12.50",
    "age_weeks": 10,
    "age_classification": "puppy",
    "env_indoor_only": false,
    "env_dog_parks": true,
    "env_daycare_boarding": false,
    "env_travel_shows": false,
    "vaccination_count": 3,
    "created_at": "2025-12-08T10:30:00Z",
    "updated_at": "2025-12-08T10:30:00Z",
    "recent_vaccinations": [
        {
            "id": 3,
            "vaccine": 1,
            "vaccine_id": "core_dap",
            "vaccine_name": "Distemper, Adenovirus, Parvovirus (DAP)",
            "date_administered": "2025-12-01",
            "dose_number": 2,
            "notes": "Second DAP dose",
            "administered_by": "Dr. Smith",
            "created_at": "2025-12-01T10:00:00Z",
            "updated_at": "2025-12-01T10:00:00Z"
        },
        {
            "id": 2,
            "vaccine": 1,
            "vaccine_id": "core_dap",
            "vaccine_name": "Distemper, Adenovirus, Parvovirus (DAP)",
            "date_administered": "2025-11-15",
            "dose_number": 1,
            "notes": "First DAP dose",
            "administered_by": "Dr. Smith",
            "created_at": "2025-11-15T09:00:00Z",
            "updated_at": "2025-11-15T09:00:00Z"
        }
    ]
}
```

**Error Response:** `404 Not Found`
```json
{
    "detail": "No Dog matches the given query."
}
```

---

### Update a Dog

**Endpoint:** `PUT /api/dogs/{id}/`

**Authentication:** Required

**Request Body:**
```json
{
    "name": "Buddy",
    "breed": "Golden Retriever",
    "sex": "MN",
    "birth_date": "2025-10-01",
    "weight_kg": 14.0,
    "env_indoor_only": false,
    "env_dog_parks": true,
    "env_daycare_boarding": true,
    "env_travel_shows": false
}
```

**Success Response:** `200 OK`
```json
{
    "id": 1,
    "name": "Buddy",
    "breed": "Golden Retriever",
    "sex": "MN",
    "sex_display": "Male (Neutered)",
    "birth_date": "2025-10-01",
    "weight_kg": "14.00",
    "age_weeks": 10,
    "age_classification": "puppy",
    "env_indoor_only": false,
    "env_dog_parks": true,
    "env_daycare_boarding": true,
    "env_travel_shows": false,
    "vaccination_count": 3,
    "created_at": "2025-12-08T10:30:00Z",
    "updated_at": "2025-12-08T11:00:00Z"
}
```

---

### Partial Update a Dog

**Endpoint:** `PATCH /api/dogs/{id}/`

**Authentication:** Required

**Request Body:** (only include fields to update)
```json
{
    "weight_kg": 15.5
}
```

**Success Response:** `200 OK`
```json
{
    "id": 1,
    "name": "Buddy",
    "breed": "Golden Retriever",
    "sex": "MN",
    "sex_display": "Male (Neutered)",
    "birth_date": "2025-10-01",
    "weight_kg": "15.50",
    "age_weeks": 10,
    "age_classification": "puppy",
    "env_indoor_only": false,
    "env_dog_parks": true,
    "env_daycare_boarding": true,
    "env_travel_shows": false,
    "vaccination_count": 3,
    "created_at": "2025-12-08T10:30:00Z",
    "updated_at": "2025-12-08T11:30:00Z"
}
```

---

### Delete a Dog

**Endpoint:** `DELETE /api/dogs/{id}/`

**Authentication:** Required

**Success Response:** `204 No Content`

---

## Vaccinations

### List All Vaccines

**Endpoint:** `GET /api/vaccines/`

**Authentication:** Required

**Success Response:** `200 OK`
```json
{
    "count": 7,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 1,
            "vaccine_id": "core_dap",
            "name": "Distemper, Adenovirus, Parvovirus (DAP)",
            "vaccine_type": "core",
            "type_display": "Core",
            "is_active": true
        },
        {
            "id": 2,
            "vaccine_id": "core_lepto",
            "name": "Leptospirosis",
            "vaccine_type": "core",
            "type_display": "Core",
            "is_active": true
        },
        {
            "id": 3,
            "vaccine_id": "core_rabies",
            "name": "Rabies",
            "vaccine_type": "core",
            "type_display": "Core",
            "is_active": true
        },
        {
            "id": 4,
            "vaccine_id": "noncore_lyme",
            "name": "Lyme (Borrelia)",
            "vaccine_type": "noncore",
            "type_display": "Non-Core",
            "is_active": true
        },
        {
            "id": 5,
            "vaccine_id": "noncore_bord_inj",
            "name": "Bordetella (Injection)",
            "vaccine_type": "noncore",
            "type_display": "Non-Core",
            "is_active": true
        },
        {
            "id": 6,
            "vaccine_id": "noncore_bord_in",
            "name": "Bordetella (Intranasal/Oral)",
            "vaccine_type": "noncore",
            "type_display": "Non-Core",
            "is_active": true
        },
        {
            "id": 7,
            "vaccine_id": "noncore_flu",
            "name": "Canine Influenza (H3N8/H3N2)",
            "vaccine_type": "noncore",
            "type_display": "Non-Core",
            "is_active": true
        }
    ]
}
```

---

### Get Vaccine Details

**Endpoint:** `GET /api/vaccines/{id}/`

**Authentication:** Required

**Success Response:** `200 OK`
```json
{
    "id": 1,
    "vaccine_id": "core_dap",
    "name": "Distemper, Adenovirus, Parvovirus (DAP)",
    "vaccine_type": "core",
    "type_display": "Core",
    "min_start_age_weeks": null,
    "rules_json": [
        {
            "condition": "age_weeks <= 16",
            "doses": 3,
            "interval_days": 28,
            "min_interval": 14,
            "max_interval": 42,
            "initial_booster_days": 365,
            "subsequent_booster_days": 1095,
            "notes": "Puppy series: 3 doses, 2-4 weeks apart"
        },
        {
            "condition": "age_weeks > 16",
            "doses": 2,
            "interval_days": 28,
            "min_interval": 14,
            "max_interval": 42,
            "initial_booster_days": 365,
            "subsequent_booster_days": 1095,
            "notes": "Adult series: 2 doses, 2-4 weeks apart"
        }
    ],
    "is_active": true
}
```

---

### List Dog's Vaccination History

**Endpoint:** `GET /api/dogs/{dog_id}/vaccinations/`

**Authentication:** Required

**Success Response:** `200 OK`
```json
[
    {
        "id": 3,
        "vaccine": 1,
        "vaccine_id": "core_dap",
        "vaccine_name": "Distemper, Adenovirus, Parvovirus (DAP)",
        "date_administered": "2025-12-01",
        "dose_number": 2,
        "notes": "Second DAP dose",
        "administered_by": "Dr. Smith",
        "created_at": "2025-12-01T10:00:00Z",
        "updated_at": "2025-12-01T10:00:00Z"
    },
    {
        "id": 2,
        "vaccine": 1,
        "vaccine_id": "core_dap",
        "vaccine_name": "Distemper, Adenovirus, Parvovirus (DAP)",
        "date_administered": "2025-11-15",
        "dose_number": 1,
        "notes": "First DAP dose",
        "administered_by": "Dr. Smith",
        "created_at": "2025-11-15T09:00:00Z",
        "updated_at": "2025-11-15T09:00:00Z"
    }
]
```

---

### Add Vaccination Record

**Endpoint:** `POST /api/dogs/{dog_id}/vaccinations/`

**Authentication:** Required

**Request Body:**
```json
{
    "vaccine_id": "core_dap",
    "date_administered": "2025-12-08",
    "dose_number": 3,
    "notes": "Third and final DAP dose in puppy series",
    "administered_by": "Dr. Smith"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vaccine_id | string | Yes | Vaccine identifier (e.g., `core_dap`) |
| date_administered | date | Yes | Format: YYYY-MM-DD |
| dose_number | integer | No | Dose number in series |
| notes | string | No | Additional notes |
| administered_by | string | No | Veterinarian name |

**Available vaccine_id values:**
- `core_dap` - Distemper, Adenovirus, Parvovirus
- `core_lepto` - Leptospirosis
- `core_rabies` - Rabies
- `noncore_lyme` - Lyme (Borrelia)
- `noncore_bord_inj` - Bordetella (Injection)
- `noncore_bord_in` - Bordetella (Intranasal/Oral)
- `noncore_flu` - Canine Influenza

**Success Response:** `201 Created`
```json
{
    "id": 4,
    "vaccine": 1,
    "vaccine_id": "core_dap",
    "vaccine_name": "Distemper, Adenovirus, Parvovirus (DAP)",
    "date_administered": "2025-12-08",
    "dose_number": 3,
    "notes": "Third and final DAP dose in puppy series",
    "administered_by": "Dr. Smith",
    "created_at": "2025-12-08T14:00:00Z",
    "updated_at": "2025-12-08T14:00:00Z"
}
```

**Error Response:** `400 Bad Request`
```json
{
    "vaccine_id": ["Vaccine 'invalid_vaccine' not found."],
    "date_administered": ["Date administered cannot be in the future."]
}
```

---

### Update Vaccination Record

**Endpoint:** `PUT /api/dogs/{dog_id}/vaccinations/{id}/`

**Authentication:** Required

**Request Body:**
```json
{
    "vaccine_id": "core_dap",
    "date_administered": "2025-12-08",
    "dose_number": 3,
    "notes": "Updated notes for third DAP dose",
    "administered_by": "Dr. Johnson"
}
```

**Success Response:** `200 OK`
```json
{
    "id": 4,
    "vaccine": 1,
    "vaccine_id": "core_dap",
    "vaccine_name": "Distemper, Adenovirus, Parvovirus (DAP)",
    "date_administered": "2025-12-08",
    "dose_number": 3,
    "notes": "Updated notes for third DAP dose",
    "administered_by": "Dr. Johnson",
    "created_at": "2025-12-08T14:00:00Z",
    "updated_at": "2025-12-08T14:30:00Z"
}
```

---

### Delete Vaccination Record

**Endpoint:** `DELETE /api/dogs/{dog_id}/vaccinations/{id}/`

**Authentication:** Required

**Success Response:** `204 No Content`

---

## Schedule Calculation

### Calculate Vaccine Schedule

**Endpoint:** `POST /api/dogs/{dog_id}/schedule/`

**Authentication:** Required

**Request Body:**
```json
{
    "selected_noncore": ["noncore_lyme", "noncore_bord_in"],
    "reference_date": "2025-12-08"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selected_noncore | array | No | List of non-core vaccine IDs to include |
| reference_date | date | No | Date to calculate from (default: today) |

**Non-core vaccine options:**
- `noncore_lyme` - Lyme disease vaccine
- `noncore_bord_inj` - Bordetella injection
- `noncore_bord_in` - Bordetella intranasal/oral
- `noncore_flu` - Canine influenza

**Success Response:** `200 OK`
```json
{
    "dog": {
        "id": 1,
        "name": "Buddy",
        "breed": "Golden Retriever",
        "birth_date": "2025-10-01",
        "age_weeks": 10,
        "age_classification": "puppy"
    },
    "schedule": {
        "overdue": [
            {
                "vaccine": "Distemper, Adenovirus, Parvovirus (DAP)",
                "dose": "Initial Series: Dose 3",
                "date": "2025-12-01",
                "notes": "Completes initial series.",
                "days_overdue": 7
            }
        ],
        "upcoming": [
            {
                "vaccine": "Leptospirosis",
                "dose": "Initial Series: Dose 1",
                "date": "2025-12-15",
                "notes": "Series continues (28 day interval).",
                "days_until": 7
            },
            {
                "vaccine": "Lyme (Borrelia)",
                "dose": "Initial Series: Dose 1",
                "date": "2025-12-20",
                "notes": "Series continues (28 day interval).",
                "days_until": 12
            }
        ],
        "future": [
            {
                "vaccine": "Rabies",
                "dose": "Initial Series: Dose 1",
                "date": "2025-12-29",
                "notes": "Required by law.",
                "days_until": 21
            },
            {
                "vaccine": "Leptospirosis",
                "dose": "Initial Series: Dose 2",
                "date": "2026-01-12",
                "notes": "Completes initial series.",
                "days_until": 35
            },
            {
                "vaccine": "Bordetella (Intranasal/Oral)",
                "dose": "Initial Series: Dose 1",
                "date": "2026-01-15",
                "notes": "Single dose provides protection.",
                "days_until": 38
            }
        ]
    },
    "history_analysis": "History appears consistent with standard timing intervals.",
    "generated_at": "2025-12-08T14:30:00Z"
}
```

**Schedule Categories:**
- **overdue**: Vaccines that should have been given before today
- **upcoming**: Vaccines due within the next 30 days
- **future**: Vaccines scheduled more than 30 days out

---

### Analyze Vaccination History

**Endpoint:** `GET /api/dogs/{dog_id}/schedule/history-analysis/`

**Authentication:** Required

**Success Response:** `200 OK`
```json
{
    "dog_id": 1,
    "dog_name": "Buddy",
    "analysis": "History appears consistent with standard timing intervals.",
    "vaccination_count": 3
}
```

**Example with warnings:**
```json
{
    "dog_id": 1,
    "dog_name": "Buddy",
    "analysis": "- WARNING: Distemper, Adenovirus, Parvovirus (DAP) Dose 2 given 10 days after previous. Too close (min 14 days).\n- NOTE: Leptospirosis Dose 2 given 50 days after previous. Ensure series is not overdue.",
    "vaccination_count": 5
}
```

---

## AI Analysis

### Check AI Service Status

**Endpoint:** `GET /api/ai/status/`

**Authentication:** Required

**Success Response:** `200 OK`
```json
{
    "initialized": true,
    "available": true,
    "error": null
}
```

**When not initialized:**
```json
{
    "initialized": false,
    "available": false,
    "error": "No PDF or TXT documents found"
}
```

---

### General AI Query

**Endpoint:** `POST /api/ai/query/`

**Authentication:** Required

**Request Body:**
```json
{
    "query": "Why is the 2-4 week interval important for puppy vaccinations?"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | Question about vaccinations (max 1000 chars) |

**Success Response:** `200 OK`
```json
{
    "answer": "The 2-4 week interval between puppy vaccinations is critical because maternal antibodies can interfere with vaccine response. By spacing doses 2-4 weeks apart, we ensure the puppy's immune system has time to respond while maintaining protection as maternal antibodies wane.",
    "sources": [
        {
            "document": "AAHA_Canine_Vaccination_Guidelines.pdf",
            "excerpt": "Maternal antibodies can interfere with the immune response to vaccination. The timing of the initial vaccination series should account for the gradual decline of maternal antibodies..."
        }
    ]
}
```

**Error Response (Service Unavailable):** `503 Service Unavailable`
```json
{
    "error": "AI service is not available",
    "status": {
        "initialized": false,
        "available": false,
        "error": "No PDF or TXT documents found"
    }
}
```

---

### Dog-Specific AI Analysis

**Endpoint:** `POST /api/dogs/{dog_id}/ai-analysis/`

**Authentication:** Required

**Request Body:**
```json
{
    "include_schedule": true,
    "selected_noncore": ["noncore_lyme"],
    "custom_query": "Should this puppy get the Lyme vaccine given its lifestyle?"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| include_schedule | boolean | No | Include schedule in analysis (default: true) |
| selected_noncore | array | No | Non-core vaccines to consider |
| custom_query | string | No | Custom question about this dog |

**Success Response:** `200 OK`
```json
{
    "dog": {
        "id": 1,
        "name": "Buddy",
        "breed": "Golden Retriever",
        "age_weeks": 10,
        "age_classification": "puppy"
    },
    "analysis": "Based on AAHA guidelines, this 10-week-old puppy visiting dog parks should be considered for Lyme vaccination if in an endemic area. The Lyme vaccine is recommended for dogs with tick exposure risk. Given the dog's lifestyle including regular dog park visits, Lyme vaccination would be appropriate once the puppy reaches 12 weeks of age.",
    "sources": [
        {
            "document": "AAHA_Canine_Vaccination_Guidelines.pdf",
            "excerpt": "Lyme vaccine is recommended for dogs living in or traveling to areas where Lyme disease is endemic and where tick exposure is likely..."
        }
    ],
    "schedule_summary": {
        "overdue_count": 1,
        "upcoming_count": 2,
        "future_count": 4
    }
}
```

---

## Error Responses

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - No permission to access resource |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Server-side error |
| 503 | Service Unavailable - AI service not ready |

### Authentication Error

```json
{
    "detail": "Authentication credentials were not provided."
}
```

### Validation Error

```json
{
    "field_name": [
        "Error message describing the validation failure."
    ]
}
```

### Not Found Error

```json
{
    "detail": "No Dog matches the given query."
}
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. For production deployments, consider adding rate limiting middleware.

---

## Pagination

List endpoints return paginated results with 20 items per page:

```json
{
    "count": 50,
    "next": "http://localhost:8000/api/dogs/?page=2",
    "previous": null,
    "results": [...]
}
```

---

## Example Usage with cURL

### Register and Login

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"drsmith","email":"dr@vet.com","password":"SecurePass123!","password_confirm":"SecurePass123!"}'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"drsmith","password":"SecurePass123!"}'
```

### Create Dog and Calculate Schedule

```bash
# Set your access token
TOKEN="your_access_token_here"

# Create a dog
curl -X POST http://localhost:8000/api/dogs/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Buddy","breed":"Golden Retriever","birth_date":"2025-10-01","sex":"MN"}'

# Calculate schedule (assuming dog_id=1)
curl -X POST http://localhost:8000/api/dogs/1/schedule/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"selected_noncore":["noncore_lyme","noncore_bord_in"]}'
```

### Add Vaccination Record

```bash
curl -X POST http://localhost:8000/api/dogs/1/vaccinations/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vaccine_id":"core_dap","date_administered":"2025-11-15","dose_number":1,"notes":"First DAP dose","administered_by":"Dr. Smith"}'
```

---

## Example Usage with Python

```python
import requests

BASE_URL = "http://localhost:8000/api"

# Login
response = requests.post(f"{BASE_URL}/auth/login/", json={
    "username": "drsmith",
    "password": "SecurePass123!"
})
tokens = response.json()
access_token = tokens["access"]

# Set headers for authenticated requests
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Create a dog
dog_data = {
    "name": "Buddy",
    "breed": "Golden Retriever",
    "birth_date": "2025-10-01",
    "sex": "MN",
    "env_dog_parks": True
}
response = requests.post(f"{BASE_URL}/dogs/", json=dog_data, headers=headers)
dog = response.json()
print(f"Created dog: {dog['name']} (ID: {dog['id']})")

# Calculate vaccine schedule
schedule_request = {
    "selected_noncore": ["noncore_lyme", "noncore_bord_in"]
}
response = requests.post(
    f"{BASE_URL}/dogs/{dog['id']}/schedule/",
    json=schedule_request,
    headers=headers
)
schedule = response.json()

print(f"\nVaccine Schedule for {schedule['dog']['name']}:")
print(f"Age: {schedule['dog']['age_weeks']} weeks ({schedule['dog']['age_classification']})")

print("\nOverdue:")
for item in schedule['schedule']['overdue']:
    print(f"  - {item['vaccine']}: {item['dose']} ({item['days_overdue']} days overdue)")

print("\nUpcoming (next 30 days):")
for item in schedule['schedule']['upcoming']:
    print(f"  - {item['vaccine']}: {item['dose']} (in {item['days_until']} days)")

print("\nFuture:")
for item in schedule['schedule']['future']:
    print(f"  - {item['vaccine']}: {item['dose']} (in {item['days_until']} days)")
```

---

## Changelog

- **v1.0.0** - Initial Django REST API release
  - JWT authentication
  - Dog (patient) management
  - Vaccination record tracking
  - Rule-based schedule calculation
  - AI-powered analysis using RAG
