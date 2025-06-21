import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import Base, User, Team, Feedback
import uuid

def setup_database(database_url=None):
    if database_url is None:
        database_url = os.getenv("DATABASE_URL", "sqlite:///./feedback_system.db")
    print(f"Setting up database: {database_url}")
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
    )
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).first():
            print("⚠️  Sample data already exists")
            return
        dev_team = Team(name="Development Team")
        marketing_team = Team(name="Marketing Team")
        db.add_all([dev_team, marketing_team])
        db.flush()
        manager1 = User(
            username="manager1",
            password="password123",
            role="manager",
            team_id=dev_team.id
        )
        manager2 = User(
            username="manager2",
            password="password123",
            role="manager",
            team_id=marketing_team.id
        )
        db.add_all([manager1, manager2])
        db.flush()
        dev_team.manager_id = manager1.id
        marketing_team.manager_id = manager2.id
        employees = [
            User(username="employee1", password="password123", role="employee", team_id=dev_team.id),
            User(username="employee2", password="password123", role="employee", team_id=dev_team.id),
            User(username="employee3", password="password123", role="employee", team_id=dev_team.id),
            User(username="employee4", password="password123", role="employee", team_id=marketing_team.id),
            User(username="employee5", password="password123", role="employee", team_id=marketing_team.id),
        ]
        db.add_all(employees)
        db.flush()
        sample_feedback = [
            Feedback(
                manager_id=manager1.id,
                employee_id=employees[0].id,
                strengths="Excellent problem-solving skills and attention to detail",
                areas_to_improve="Could improve communication with stakeholders",
                sentiment="positive"
            ),
            Feedback(
                manager_id=manager1.id,
                employee_id=employees[1].id,
                strengths="Great teamwork and collaboration",
                areas_to_improve="Time management could be better",
                sentiment="neutral"
            ),
            Feedback(
                manager_id=manager2.id,
                employee_id=employees[3].id,
                strengths="Creative thinking and innovative ideas",
                areas_to_improve="Need to meet deadlines more consistently",
                sentiment="positive"
            )
        ]
        db.add_all(sample_feedback)
        db.commit()
        print("✅ Sample data created successfully")
        print("\n📊 Created:")
        print(f"   - {len([manager1, manager2])} managers")
        print(f"   - {len(employees)} employees")
        print(f"   - {len([dev_team, marketing_team])} teams")
        print(f"   - {len(sample_feedback)} feedback entries")
        print("\n🔑 Login credentials:")
        print("   Managers: manager1/password123, manager2/password123")
        print("   Employees: employee1/password123, employee2/password123, etc.")
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        db.rollback()
    finally:
        db.close()

def reset_database(database_url=None):
    if database_url is None:
        database_url = os.getenv("DATABASE_URL", "sqlite:///./feedback_system.db")
    print(f"Resetting database: {database_url}")
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
    )
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped")
    setup_database(database_url)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        reset_database()
    else:
        setup_database()
