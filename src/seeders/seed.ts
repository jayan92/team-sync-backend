import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../config/database.config";
import UserModel from "../models/user.model";
import AccountModel from "../models/account.model";
import WorkspaceModel from "../models/workspace.model";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import RoleModel from "../models/roles-permission.model";
import { RolePermissions } from "../utils/role-permission";
import { ProviderEnum } from "../enums/account-provider.enum";
import { TaskStatusEnum, TaskPriorityEnum } from "../enums/task.enum";

// ──────────────────────────────────────────
// Fake data
// ──────────────────────────────────────────

const USERS = [
  { name: "Alice Johnson",  email: "alice@teamsync.dev",  password: "Alice@1234"  },
  { name: "Bob Smith",      email: "bob@teamsync.dev",    password: "Bob@1234"    },
  { name: "Carol White",    email: "carol@teamsync.dev",  password: "Carol@1234"  },
  { name: "David Brown",    email: "david@teamsync.dev",  password: "David@1234"  },
  { name: "Eva Martinez",   email: "eva@teamsync.dev",    password: "Eva@1234"    },
];

const WORKSPACES = [
  { name: "Alpha Team",   description: "Frontend & product team"    },
  { name: "Beta Studio",  description: "Design & marketing studio"  },
];

const PROJECTS: Record<string, { name: string; emoji: string; description: string }[]> = {
  "Alpha Team": [
    { name: "Website Redesign",  emoji: "🎨", description: "Full redesign of the company website"   },
    { name: "Mobile App",        emoji: "📱", description: "Cross-platform mobile application"       },
  ],
  "Beta Studio": [
    { name: "Marketing Campaign", emoji: "📢", description: "Q3 digital marketing campaign"          },
    { name: "Data Analytics",     emoji: "📊", description: "Customer behaviour analytics dashboard" },
  ],
};

const TASKS = [
  { title: "Set up project repository",       status: TaskStatusEnum.DONE,        priority: TaskPriorityEnum.HIGH,   daysFromNow: -10 },
  { title: "Design landing page wireframes",  status: TaskStatusEnum.DONE,        priority: TaskPriorityEnum.HIGH,   daysFromNow: -7  },
  { title: "Implement authentication flow",   status: TaskStatusEnum.IN_REVIEW,   priority: TaskPriorityEnum.HIGH,   daysFromNow: -2  },
  { title: "Write unit tests",                status: TaskStatusEnum.IN_PROGRESS,  priority: TaskPriorityEnum.MEDIUM, daysFromNow: 3   },
  { title: "Create API documentation",        status: TaskStatusEnum.TODO,        priority: TaskPriorityEnum.MEDIUM, daysFromNow: 7   },
  { title: "Performance optimisation",        status: TaskStatusEnum.BACKLOG,     priority: TaskPriorityEnum.LOW,    daysFromNow: 14  },
  { title: "User acceptance testing",         status: TaskStatusEnum.BACKLOG,     priority: TaskPriorityEnum.LOW,    daysFromNow: 21  },
];

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ──────────────────────────────────────────
// Main seeder
// ──────────────────────────────────────────

const seed = async () => {
  console.log("\n🌱  TeamSync database seeder\n");

  try {
    await connectDatabase();

    // ── 1. Roles ──────────────────────────
    console.log("→ Clearing existing data...");
    await TaskModel.deleteMany({});
    await ProjectModel.deleteMany({});
    await MemberModel.deleteMany({});
    await WorkspaceModel.deleteMany({});
    await AccountModel.deleteMany({});
    await UserModel.deleteMany({});
    await RoleModel.deleteMany({});

    console.log("→ Seeding roles...");
    const roleMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const roleName in RolePermissions) {
      const role = roleName as keyof typeof RolePermissions;
      const created = await RoleModel.create({
        name: role,
        permissions: RolePermissions[role],
      });
      roleMap[role] = created._id as mongoose.Types.ObjectId;
      console.log(`   ✔ Role: ${role}`);
    }

    // ── 2. Users ──────────────────────────
    console.log("→ Seeding users...");
    const userMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const u of USERS) {
      const user = new UserModel({ name: u.name, email: u.email, password: u.password, isActive: true });
      await user.save(); // pre-save hook hashes the password automatically
      userMap[u.email] = user._id as mongoose.Types.ObjectId;

      await AccountModel.create({
        userId: user._id,
        provider: ProviderEnum.EMAIL,
        providerId: u.email,
      });
      console.log(`   ✔ User: ${u.name} <${u.email}>  password: ${u.password}`);
    }

    // ── 3. Workspaces & members ───────────
    console.log("→ Seeding workspaces & members...");

    // Alpha Team — owned by Alice
    const alphaWorkspace = await WorkspaceModel.create({
      name: WORKSPACES[0].name,
      description: WORKSPACES[0].description,
      owner: userMap["alice@teamsync.dev"],
    });
    await UserModel.findByIdAndUpdate(userMap["alice@teamsync.dev"], { currentWorkspace: alphaWorkspace._id });

    await MemberModel.create([
      { userId: userMap["alice@teamsync.dev"],  workspaceId: alphaWorkspace._id, role: roleMap["OWNER"] },
      { userId: userMap["carol@teamsync.dev"],  workspaceId: alphaWorkspace._id, role: roleMap["ADMIN"] },
      { userId: userMap["david@teamsync.dev"],  workspaceId: alphaWorkspace._id, role: roleMap["MEMBER"] },
      { userId: userMap["eva@teamsync.dev"],    workspaceId: alphaWorkspace._id, role: roleMap["MEMBER"] },
    ]);
    console.log(`   ✔ Workspace: Alpha Team  (Alice=OWNER, Carol=ADMIN, David=MEMBER, Eva=MEMBER)`);

    // Beta Studio — owned by Bob
    const betaWorkspace = await WorkspaceModel.create({
      name: WORKSPACES[1].name,
      description: WORKSPACES[1].description,
      owner: userMap["bob@teamsync.dev"],
    });
    await UserModel.findByIdAndUpdate(userMap["bob@teamsync.dev"], { currentWorkspace: betaWorkspace._id });

    await MemberModel.create([
      { userId: userMap["bob@teamsync.dev"],  workspaceId: betaWorkspace._id, role: roleMap["OWNER"] },
      { userId: userMap["eva@teamsync.dev"],  workspaceId: betaWorkspace._id, role: roleMap["MEMBER"] },
    ]);
    console.log(`   ✔ Workspace: Beta Studio  (Bob=OWNER, Eva=MEMBER)`);

    // ── 4. Projects & tasks ───────────────
    console.log("→ Seeding projects & tasks...");

    const workspaceSetup = [
      { workspace: alphaWorkspace, ownerEmail: "alice@teamsync.dev",  assignees: ["alice@teamsync.dev", "carol@teamsync.dev", "david@teamsync.dev"] },
      { workspace: betaWorkspace,  ownerEmail: "bob@teamsync.dev",    assignees: ["bob@teamsync.dev", "eva@teamsync.dev"] },
    ];

    for (const { workspace, ownerEmail, assignees } of workspaceSetup) {
      const projectDefs = PROJECTS[workspace.name];
      for (const pd of projectDefs) {
        const project = await ProjectModel.create({
          name: pd.name,
          emoji: pd.emoji,
          description: pd.description,
          workspace: workspace._id,
          createdBy: userMap[ownerEmail],
        });
        console.log(`   ✔ Project: ${pd.emoji} ${pd.name}`);

        for (let i = 0; i < TASKS.length; i++) {
          const t = TASKS[i];
          const assignee = userMap[assignees[i % assignees.length]];
          await TaskModel.create({
            title: t.title,
            description: `Auto-seeded task for ${pd.name}`,
            project: project._id,
            workspace: workspace._id,
            status: t.status,
            priority: t.priority,
            assignedTo: assignee,
            createdBy: userMap[ownerEmail],
            dueDate: daysFromNow(t.daysFromNow),
          });
        }
        console.log(`      └─ ${TASKS.length} tasks added`);
      }
    }

    // ── Done ──────────────────────────────
    console.log("\n✅  Seeding complete!\n");
    console.log("Login credentials:");
    console.log("─────────────────────────────────────────────────────");
    for (const u of USERS) {
      console.log(`  ${u.email.padEnd(30)} password: ${u.password}`);
    }
    console.log("─────────────────────────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌  Seeding failed:", error);
    process.exit(1);
  }
};

seed();
