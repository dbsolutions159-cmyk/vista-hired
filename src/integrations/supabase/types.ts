export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          from_stage: Database["public"]["Enums"]["application_stage"] | null
          id: string
          note: string | null
          to_stage: Database["public"]["Enums"]["application_stage"]
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["application_stage"] | null
          id?: string
          note?: string | null
          to_stage: Database["public"]["Enums"]["application_stage"]
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["application_stage"] | null
          id?: string
          note?: string | null
          to_stage?: Database["public"]["Enums"]["application_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          application_id: string
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          application_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          city: string
          cover_letter: string | null
          created_at: string
          current_company: string | null
          email: string
          experience: string
          full_name: string
          id: string
          job_id: string
          mobile: string
          qualification: string
          resume_path: string
          resume_url: string
          stage: Database["public"]["Enums"]["application_stage"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          cover_letter?: string | null
          created_at?: string
          current_company?: string | null
          email: string
          experience: string
          full_name: string
          id?: string
          job_id: string
          mobile: string
          qualification: string
          resume_path: string
          resume_url: string
          stage?: Database["public"]["Enums"]["application_stage"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          cover_letter?: string | null
          created_at?: string
          current_company?: string | null
          email?: string
          experience?: string
          full_name?: string
          id?: string
          job_id?: string
          mobile?: string
          qualification?: string
          resume_path?: string
          resume_url?: string
          stage?: Database["public"]["Enums"]["application_stage"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_education: {
        Row: {
          created_at: string
          degree: string
          end_year: string | null
          field_of_study: string | null
          grade: string | null
          id: string
          institution: string
          start_year: string | null
          university: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          degree: string
          end_year?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution: string
          start_year?: string | null
          university?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string
          end_year?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution?: string
          start_year?: string | null
          university?: string | null
          user_id?: string
        }
        Relationships: []
      }
      candidate_experience: {
        Row: {
          company: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean
          job_title: string
          location: string | null
          start_date: string | null
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title: string
          location?: string | null
          start_date?: string | null
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title?: string
          location?: string | null
          start_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cta_clicks: {
        Row: {
          created_at: string
          cta: string
          external_job_id: string | null
          id: string
          job_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          cta: string
          external_job_id?: string | null
          id?: string
          job_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          cta?: string
          external_job_id?: string | null
          id?: string
          job_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cta_clicks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          candidate_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          interviewer_name: string | null
          job_id: string
          location: string | null
          meeting_link: string | null
          mode: string
          notes: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          candidate_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          interviewer_name?: string | null
          job_id: string
          location?: string | null
          meeting_link?: string | null
          mode?: string
          notes?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          interviewer_name?: string | null
          job_id?: string
          location?: string | null
          meeting_link?: string | null
          mode?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_contacts: {
        Row: {
          created_at: string
          hr_email: string | null
          hr_name: string | null
          hr_phone: string | null
          job_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hr_email?: string | null
          hr_name?: string | null
          hr_phone?: string | null
          job_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hr_email?: string | null
          hr_name?: string | null
          hr_phone?: string | null
          job_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_url: string | null
          benefits: string | null
          category: string | null
          company_logo_url: string | null
          company_name: string
          company_website: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          experience: string | null
          featured: boolean
          id: string
          location: string
          openings: number | null
          poster_role: Database["public"]["Enums"]["poster_role"]
          poster_user_id: string | null
          published: boolean
          qualification: string | null
          rejection_reason: string | null
          responsibilities: string | null
          salary_currency: string
          salary_max: number | null
          salary_min: number | null
          skills: string[] | null
          state: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          urgent: boolean
          verified: boolean
          video_url: string | null
          view_count: number
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          apply_url?: string | null
          benefits?: string | null
          category?: string | null
          company_logo_url?: string | null
          company_name: string
          company_website?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience?: string | null
          featured?: boolean
          id?: string
          location: string
          openings?: number | null
          poster_role?: Database["public"]["Enums"]["poster_role"]
          poster_user_id?: string | null
          published?: boolean
          qualification?: string | null
          rejection_reason?: string | null
          responsibilities?: string | null
          salary_currency?: string
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          urgent?: boolean
          verified?: boolean
          video_url?: string | null
          view_count?: number
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          apply_url?: string | null
          benefits?: string | null
          category?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_website?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience?: string | null
          featured?: boolean
          id?: string
          location?: string
          openings?: number | null
          poster_role?: Database["public"]["Enums"]["poster_role"]
          poster_user_id?: string | null
          published?: boolean
          qualification?: string | null
          rejection_reason?: string | null
          responsibilities?: string | null
          salary_currency?: string
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          urgent?: boolean
          verified?: boolean
          video_url?: string | null
          view_count?: number
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          current_company: string | null
          current_job_title: string | null
          current_salary: string | null
          date_of_birth: string | null
          education: string | null
          email: string | null
          employment_pref: string | null
          expected_salary: string | null
          experience_summary: string | null
          experience_years: string | null
          full_name: string | null
          gender: string | null
          headline: string | null
          id: string
          is_fresher: boolean | null
          languages: string[] | null
          linkedin_url: string | null
          notice_period: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_location: string | null
          preferred_role: string | null
          resume_name: string | null
          resume_path: string | null
          skills: string[] | null
          state: string | null
          updated_at: string
          work_mode: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          current_company?: string | null
          current_job_title?: string | null
          current_salary?: string | null
          date_of_birth?: string | null
          education?: string | null
          email?: string | null
          employment_pref?: string | null
          expected_salary?: string | null
          experience_summary?: string | null
          experience_years?: string | null
          full_name?: string | null
          gender?: string | null
          headline?: string | null
          id: string
          is_fresher?: boolean | null
          languages?: string[] | null
          linkedin_url?: string | null
          notice_period?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_location?: string | null
          preferred_role?: string | null
          resume_name?: string | null
          resume_path?: string | null
          skills?: string[] | null
          state?: string | null
          updated_at?: string
          work_mode?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          current_company?: string | null
          current_job_title?: string | null
          current_salary?: string | null
          date_of_birth?: string | null
          education?: string | null
          email?: string | null
          employment_pref?: string | null
          expected_salary?: string | null
          experience_summary?: string | null
          experience_years?: string | null
          full_name?: string | null
          gender?: string | null
          headline?: string | null
          id?: string
          is_fresher?: boolean | null
          languages?: string[] | null
          linkedin_url?: string | null
          notice_period?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_location?: string | null
          preferred_role?: string | null
          resume_name?: string | null
          resume_path?: string | null
          skills?: string[] | null
          state?: string | null
          updated_at?: string
          work_mode?: string | null
        }
        Relationships: []
      }
      saved_external_jobs: {
        Row: {
          created_at: string
          external_id: string
          id: string
          payload: Json
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_id: string
          id?: string
          payload: Json
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          payload?: Json
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_job_view: { Args: { _job_id: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      owns_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      application_stage:
        | "applied"
        | "under_review"
        | "shortlisted"
        | "interview_scheduled"
        | "interview_completed"
        | "selected"
        | "offer_sent"
        | "offer_accepted"
        | "hired"
        | "rejected"
        | "withdrawn"
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "internship"
        | "freelance"
      job_status:
        | "draft"
        | "pending"
        | "approved"
        | "live"
        | "rejected"
        | "expired"
        | "closed"
        | "paused"
      poster_role: "admin" | "recruiter" | "employer" | "hr" | "consultancy"
      work_type: "onsite" | "remote" | "hybrid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      application_stage: [
        "applied",
        "under_review",
        "shortlisted",
        "interview_scheduled",
        "interview_completed",
        "selected",
        "offer_sent",
        "offer_accepted",
        "hired",
        "rejected",
        "withdrawn",
      ],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "internship",
        "freelance",
      ],
      job_status: [
        "draft",
        "pending",
        "approved",
        "live",
        "rejected",
        "expired",
        "closed",
        "paused",
      ],
      poster_role: ["admin", "recruiter", "employer", "hr", "consultancy"],
      work_type: ["onsite", "remote", "hybrid"],
    },
  },
} as const
