
-- Security fix: Add SET search_path = '' to all database functions to prevent search path injection attacks

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(requested_user_id uuid, requested_role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = requested_user_id
      AND role = requested_role
  );
$function$;

-- Fix delete_user_account function
CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  user_id_to_delete uuid := auth.uid();
BEGIN
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$function$;

-- Fix record_task_completion function
CREATE OR REPLACE FUNCTION public.record_task_completion(task_id_param uuid, user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.task_completion_history (task_id, user_id)
  VALUES (task_id_param, user_id_param);
END;
$function$;

-- Fix get_task_completions_for_week function
CREATE OR REPLACE FUNCTION public.get_task_completions_for_week(week_start timestamp with time zone)
 RETURNS TABLE(completion_date date, completion_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(completed_at) AS completion_date,
    COUNT(*) AS completion_count
  FROM 
    public.task_completion_history
  WHERE 
    completed_at >= week_start AND
    completed_at < week_start + interval '7 days'
  GROUP BY 
    DATE(completed_at)
  ORDER BY 
    completion_date;
END;
$function$;

-- Fix get_linked_partner_id function
CREATE OR REPLACE FUNCTION public.get_linked_partner_id(user_id_param uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT linked_partner_id 
  FROM public.profiles 
  WHERE id = user_id_param;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, points)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$function$;
