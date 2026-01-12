import os
import sys
import pandas as pd
import streamlit as st
import datetime
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.vector_db import VectorDBManager
from core.rag import RAGPipeline
from core.ingestion import check_and_process_documents
from core.scheduler import RuleBasedScheduler

load_dotenv()

def main():
    st.set_page_config(page_title="AI Vaccine Planner", layout="wide")
    
    if "rag_pipeline" not in st.session_state:
        st.session_state.rag_pipeline = None
    if "db_manager" not in st.session_state:
        st.session_state.db_manager = VectorDBManager()

    scheduler = RuleBasedScheduler()
    # Map for dropdowns
    vaccine_map = {v['name']: v['id'] for v in scheduler.rules}
    vaccine_names = list(vaccine_map.keys())

    # Auto-Ingestion
    with st.spinner("Checking knowledge base..."):
        if check_and_process_documents(st.session_state.db_manager):
            st.toast("Knowledge base updated!", icon="📚")
            st.session_state.rag_pipeline = None

    if st.session_state.rag_pipeline is None:
        try:
            if os.path.exists("llm_context"):
                 files = [os.path.join("llm_context", f) for f in os.listdir("llm_context") if f.endswith(('.pdf', '.txt'))]
                 if files:
                     docs = st.session_state.db_manager.load_documents(files)
                     if docs:
                         v_store = st.session_state.db_manager.create_vector_store(docs)
                         st.session_state.rag_pipeline = RAGPipeline(v_store)
        except Exception:
            pass

    st.title("AI Vaccine Scheduler")
    col1, col2 = st.columns([1, 2])

    with col1:
        st.subheader("Patient Details")
        with st.form("input_form"):
            dog_name = st.text_input("Dog's Name", "Buddy")
            breed = st.text_input("Breed (optional)", "")

            col_sex, col_weight = st.columns(2)
            with col_sex:
                sex = st.selectbox(
                    "Sex",
                    ["Male", "Female", "Male (Neutered)", "Female (Spayed)"]
                )
            with col_weight:
                weight = st.number_input("Weight (kg)", min_value=0.5, max_value=100.0, value=10.0, step=0.5)

            dob = st.date_input("Date of Birth", datetime.date.today() - datetime.timedelta(weeks=8))

            st.markdown("### Living Environment")
            st.caption("Select all that apply to help determine recommended vaccines")
            col_env1, col_env2 = st.columns(2)
            with col_env1:
                env_indoor = st.checkbox("Indoor only", value=False)
                env_parks = st.checkbox("Dog parks / public areas", value=False)
            with col_env2:
                env_daycare = st.checkbox("Daycare / boarding", value=False)
                env_travel = st.checkbox("Travel / shows", value=False)

            st.markdown("### Lifestyle / Risk Factors")

            # Non-core selection
            include_lyme = st.checkbox("Ticks/Forest Exposure (Lyme)", value=False)
            include_flu = st.checkbox("Dog Park/Group Exposure (Influenza)", value=False)

            st.markdown("**Bordetella (Kennel Cough) Preference:**")
            bord_option = st.radio(
                "Select Administration Method:",
                ("None", "Intranasal/Oral (1 Dose)", "Injection (2 Doses)"),
                index=0
            )

            st.markdown("### Past Vaccinations")
            history_template = pd.DataFrame(columns=["Vaccine", "Date Given"])

            edited_history = st.data_editor(
                history_template,
                num_rows="dynamic",
                column_config={
                    "Vaccine": st.column_config.SelectboxColumn("Vaccine Name", options=vaccine_names, required=True),
                    "Date Given": st.column_config.DateColumn("Date Administered", required=True)
                },
                hide_index=True
            )

            submitted = st.form_submit_button("Generate Schedule")

    with col2:
        if submitted:
            # Get reference date and age classification
            today = datetime.date.today()
            age_class = scheduler.get_age_classification(dob, today)
            age_weeks = (today - dob).days // 7

            # Build environment list for context
            environments = []
            if env_indoor:
                environments.append("indoor only")
            if env_parks:
                environments.append("dog parks/public areas")
            if env_daycare:
                environments.append("daycare/boarding")
            if env_travel:
                environments.append("travel/shows")

            # Prepare History
            past_history = {}
            if not edited_history.empty:
                for idx, row in edited_history.iterrows():
                    vaccine_name = row.get("Vaccine")
                    raw_date = row.get("Date Given")

                    # Skip empty rows
                    if pd.isna(vaccine_name) or vaccine_name == "":
                        continue
                    if pd.isna(raw_date):
                        st.warning(f"Row {idx+1}: Missing date for {vaccine_name}")
                        continue

                    # Parse date with explicit error handling
                    date_obj = None
                    if isinstance(raw_date, pd.Timestamp):
                        date_obj = raw_date.date()
                    elif isinstance(raw_date, datetime.date):
                        date_obj = raw_date
                    elif isinstance(raw_date, str) and raw_date.strip():
                        try:
                            date_obj = datetime.datetime.strptime(raw_date.strip(), "%Y-%m-%d").date()
                        except ValueError as e:
                            st.error(f"Row {idx+1}: Invalid date format '{raw_date}' - {e}")
                            continue

                    if date_obj:
                        v_id = vaccine_map.get(vaccine_name)
                        if v_id:
                            past_history.setdefault(v_id, []).append(date_obj)
                        else:
                            st.warning(f"Row {idx+1}: Unknown vaccine '{vaccine_name}'")
            
            # Select Non-Cores IDs
            noncore_ids = []
            if include_lyme: noncore_ids.append("noncore_lyme")
            if include_flu: noncore_ids.append("noncore_flu")
            
            if bord_option == "Intranasal/Oral (1 Dose)":
                noncore_ids.append("noncore_bord_in")
            elif bord_option == "Injection (2 Doses)":
                noncore_ids.append("noncore_bord_inj")
            
            # Debug: Show what history was captured
            if past_history:
                st.info(f"**Debug - Captured History:** {past_history}")
            else:
                st.warning("**Debug - No history captured from form**")

            # Calculate
            schedule_items = scheduler.calculate_schedule(
                dob, noncore_ids, past_history, datetime.date.today()
            )
            history_analysis = scheduler.analyze_history(dob, past_history)
            
            # Display patient summary
            st.subheader(f"Schedule for {dog_name}")
            patient_info = f"**{age_class.capitalize()}** ({age_weeks} weeks old)"
            if breed:
                patient_info += f" | **Breed:** {breed}"
            if sex:
                patient_info += f" | **Sex:** {sex}"
            if weight:
                patient_info += f" | **Weight:** {weight} kg"
            st.markdown(patient_info)

            if environments:
                st.markdown(f"**Environment:** {', '.join(environments)}")

            st.divider()

            if schedule_items:
                # Classify items as overdue, upcoming, or future
                overdue_items = []
                upcoming_items = []
                future_items = []

                for item in schedule_items:
                    item_date = datetime.datetime.strptime(item.date, "%Y-%m-%d").date()
                    days_until = (item_date - today).days
                    if days_until < 0:
                        overdue_items.append(item)
                    elif days_until <= 30:
                        upcoming_items.append(item)
                    else:
                        future_items.append(item)

                # Show overdue vaccines with warning
                if overdue_items:
                    st.warning(f"**{len(overdue_items)} Overdue Vaccine(s)**")
                    df_overdue = pd.DataFrame([vars(x) for x in overdue_items])
                    df_overdue.columns = ["Vaccine", "Dose", "Scheduled Date", "Notes"]
                    st.dataframe(df_overdue, use_container_width=True, hide_index=True)

                # Show upcoming vaccines
                if upcoming_items:
                    st.info(f"**{len(upcoming_items)} Upcoming (within 30 days)**")
                    df_upcoming = pd.DataFrame([vars(x) for x in upcoming_items])
                    df_upcoming.columns = ["Vaccine", "Dose", "Scheduled Date", "Notes"]
                    st.dataframe(df_upcoming, use_container_width=True, hide_index=True)

                # Show future vaccines
                if future_items:
                    st.markdown(f"**{len(future_items)} Future Vaccine(s)**")
                    df_future = pd.DataFrame([vars(x) for x in future_items])
                    df_future.columns = ["Vaccine", "Dose", "Scheduled Date", "Notes"]
                    st.dataframe(df_future, use_container_width=True, hide_index=True)
            else:
                st.success("No future vaccines needed immediately.")

            st.subheader("AI Analysis")
            if st.session_state.rag_pipeline:
                with st.spinner("Analyzing medical context..."):
                    past_str = "None"
                    if past_history:
                        past_str = "\n".join([f"- {k}: {[d.strftime('%Y-%m-%d') for d in v]}" for k, v in past_history.items()])

                    env_str = ", ".join(environments) if environments else "Not specified"

                    query = (
                        f"Patient: {dog_name}, a {age_class} dog ({age_weeks} weeks old).\n"
                        f"Breed: {breed if breed else 'Not specified'}, Sex: {sex}, Weight: {weight} kg.\n"
                        f"Living Environment: {env_str}.\n"
                        f"Vaccination History:\n{past_str}\n\n"
                        f"Automated Analysis Warnings:\n{history_analysis}\n\n"
                        f"Request: Provide a personalized vaccination analysis:\n"
                        f"1. Explain why the recommended vaccines are important for this {age_class} dog.\n"
                        f"2. Explain specifically why the 2-4 week interval is critical (cite the PDF).\n"
                        f"3. Based on their environment ({env_str}), mention any additional considerations.\n"
                        f"4. Mention any concerns about overdue vaccines if applicable."
                    )

                    result = st.session_state.rag_pipeline.answer_query(query)
                    st.markdown(result["answer"])

                    with st.expander("View Source Citations"):
                        for doc in result["sources"]:
                            st.markdown(f"**{doc.metadata.get('source','Unknown')}**")
                            st.markdown(f"> {doc.page_content[:300]}...")
            else:
                st.warning("Knowledge base not active.")

if __name__ == "__main__":
    main()