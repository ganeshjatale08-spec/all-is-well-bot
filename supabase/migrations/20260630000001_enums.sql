-- BACKEND_SCHEMA.md §1 — enums shared across later migrations.

create type sex_t              as enum ('male','female','other');
create type diet_t             as enum ('vegetarian','non_vegetarian','eggetarian','vegan','jain');
create type activity_t         as enum ('sedentary','lightly_active','moderately_active','very_active');
create type work_t             as enum ('desk_job','field_work','shift_worker','student','business_owner');
create type goal_t             as enum ('weight_loss','weight_gain','muscle_gain','improve_sleep',
                                        'stress_reduction','diabetes_management','general_fitness');
create type meal_t             as enum ('breakfast','lunch','dinner','snack');
create type workout_t          as enum ('gym','running','walking','yoga','cycling','home_workout');
create type mood_t             as enum ('happy','normal','stressed','sad','angry');
create type plan_t             as enum ('free','pro','family','advanced');
create type sub_status_t       as enum ('active','trialing','grace','expired','cancelled');
create type family_role_t      as enum ('admin','member');
create type report_period_t    as enum ('weekly','monthly');
