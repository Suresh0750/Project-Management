
import {
    PrismaClient,
    Role,
    ProjectStatus,
    Priority,
    TaskStatus,
    ActivityAction,
    NotificationType,
    type User,
  } from "@prisma/client";
  import { PrismaMariaDb } from "@prisma/adapter-mariadb";
  import mariadb from "mariadb";
  import dotenv from "dotenv";
  dotenv.config();
  import bcrypt from "bcryptjs";

  const dbUrl = process.env.DATABASE_URL!.replace(/^mysql:\/\//, "mariadb://");
  const pool = mariadb.createPool(dbUrl);
  const adapter = new PrismaMariaDb(pool);
  const prisma = new PrismaClient({ adapter });
  
  async function main() {
    console.log("Starting database seeding...");
  
    // Never use default passwords in production.
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const demoPassword = process.env.SEED_DEMO_PASSWORD;
  
    if (!adminPassword || !demoPassword) {
      throw new Error(
        "Please configure SEED_ADMIN_PASSWORD and SEED_DEMO_PASSWORD in .env"
      );
    }
  
    const adminEmail =
      process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const demoHash = await bcrypt.hash(demoPassword, 12);
  
  
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: "System Admin",
        role: Role.ADMIN,
        isActive: true,
      },
      create: {
        name: "System Admin",
        email: adminEmail,
        passwordHash: adminHash,
        role: Role.ADMIN,
        isActive: true,
      },
    });
  
    console.log("Admin created:", admin.email);
  
  
    const managerData = [
      {
        name: "Arun Kumar",
        email: "arun@example.com",
      },
      {
        name: "Priya Sharma",
        email: "priya@example.com",
      },
    ];
  
    const managers: User[] = [];
  
    for (const data of managerData) {
      const manager = await prisma.user.upsert({
        where: { email: data.email },
        update: {
          name: data.name,
          role: Role.PROJECT_MANAGER,
          isActive: true,
        },
        create: {
          ...data,
          passwordHash: demoHash,
          role: Role.PROJECT_MANAGER,
        },
      });
  
      managers.push(manager);
    }
  
    console.log("Project Managers created.");

    const [managerOne, managerTwo] = managers as [User, User];

    const memberData = [
      {
        name: "Suresh Kumar",
        email: "suresh@example.com",
      },
      {
        name: "Karthik Raj",
        email: "karthik@example.com",
      },
      {
        name: "Divya",
        email: "divya@example.com",
      },
    ];
  
    const members: User[] = [];
  
    for (const data of memberData) {
      const member = await prisma.user.upsert({
        where: { email: data.email },
        update: {
          name: data.name,
          role: Role.MEMBER,
          isActive: true,
        },
        create: {
          ...data,
          passwordHash: demoHash,
          role: Role.MEMBER,
        },
      });
  
      members.push(member);
    }
  
    console.log("Members created.");

    const [memberOne, memberTwo, memberThree] = members as [User, User, User];

    async function findOrCreateProject(data: {
      name: string;
      description: string;
      managerId: string;
      priority: Priority;
      status: ProjectStatus;
      startDate: Date;
      deadline: Date;
    }) {
      const existing = await prisma.project.findFirst({
        where: { name: data.name },
      });
  
      if (existing) {
        return prisma.project.update({
          where: { id: existing.id },
          data,
        });
      }
  
      return prisma.project.create({ data });
    }
  
    const projectOne = await findOrCreateProject({
      name: "Project Management Application",
      description:
        "Develop a complete project management and task tracking application.",
      managerId: managerOne.id,
      priority: Priority.HIGH,
      status: ProjectStatus.ACTIVE,
      startDate: new Date("2026-10-01"),
      deadline: new Date("2026-12-15"),
    });
  
    const projectTwo = await findOrCreateProject({
      name: "Company Website",
      description:
        "Design and develop the company website.",
      managerId: managerTwo.id,
      priority: Priority.MEDIUM,
      status: ProjectStatus.PLANNING,
      startDate: new Date("2026-11-01"),
      deadline: new Date("2027-01-15"),
    });
  
    console.log("Projects created.");
  
  
    async function addMember(
      projectId: string,
      userId: string
    ) {
      await prisma.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        update: {
          addedById: admin.id,
        },
        create: {
          projectId,
          userId,
          addedById: admin.id,
        },
      });
    }
  
    await addMember(projectOne.id, memberOne.id);
    await addMember(projectOne.id, memberTwo.id);
    await addMember(projectTwo.id, memberTwo.id);
    await addMember(projectTwo.id, memberThree.id);
  
    console.log("Project memberships created.");
  
  
    async function findOrCreateTask(data: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: Priority;
      dueDate: Date;
      position: number;
      projectId: string;
      creatorId: string;
      assigneeId: string;
      assignedById: string;
    }) {
      const existing = await prisma.task.findFirst({
        where: {
          projectId: data.projectId,
          title: data.title,
        },
      });
  
      if (existing) {
        return prisma.task.update({
          where: { id: existing.id },
          data,
        });
      }
  
      return prisma.task.create({ data });
    }
  
    const taskOne = await findOrCreateTask({
      title: "Design database schema",
      description: "Create Prisma models and database relationships.",
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      dueDate: new Date("2026-10-20"),
      position: 0,
      projectId: projectOne.id,
      creatorId: managerOne.id,
      assigneeId: memberOne.id,
      assignedById: managerOne.id,
    });
  
    const taskTwo = await findOrCreateTask({
      title: "Develop authentication APIs",
      description: "Implement registration, login and JWT authentication.",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      dueDate: new Date("2026-11-10"),
      position: 0,
      projectId: projectOne.id,
      creatorId: managerOne.id,
      assigneeId: memberTwo.id,
      assignedById: managerOne.id,
    });
  
    const taskThree = await findOrCreateTask({
      title: "Build project dashboard",
      description: "Develop dashboard UI and project statistics.",
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: new Date("2026-11-20"),
      position: 1,
      projectId: projectOne.id,
      creatorId: managerOne.id,
      assigneeId: memberOne.id,
      assignedById: managerOne.id,
    });
  
    const taskFour = await findOrCreateTask({
      title: "Implement Kanban board",
      description: "Create drag and drop task status management.",
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: new Date("2026-11-15"),
      position: 1,
      projectId: projectOne.id,
      creatorId: managerOne.id,
      assigneeId: memberTwo.id,
      assignedById: managerOne.id,
    });
  
    const taskFive = await findOrCreateTask({
      title: "Create homepage design",
      description: "Prepare responsive homepage design.",
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: new Date("2026-11-25"),
      position: 0,
      projectId: projectTwo.id,
      creatorId: managerTwo.id,
      assigneeId: memberThree.id,
      assignedById: managerTwo.id,
    });
  
    const taskSix = await findOrCreateTask({
      title: "Set up website repository",
      description: "Initialize the frontend and backend repositories.",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.LOW,
      dueDate: new Date("2026-11-18"),
      position: 1,
      projectId: projectTwo.id,
      creatorId: managerTwo.id,
      assigneeId: memberTwo.id,
      assignedById: managerTwo.id,
    });
  
    console.log("Tasks created.");
  
    // --------------------------------------------------
    // 7. CREATE SAMPLE COMMENTS
    // --------------------------------------------------
  
    const commentExists = await prisma.comment.findFirst({
      where: {
        taskId: taskTwo.id,
        authorId: memberTwo.id,
        content: "Authentication API development is in progress.",
      },
    });
  
    if (!commentExists) {
      await prisma.comment.create({
        data: {
          taskId: taskTwo.id,
          authorId: memberTwo.id,
          content: "Authentication API development is in progress.",
        },
      });
    }
  
    // --------------------------------------------------
    // 8. CREATE ACTIVITY HISTORY
    // --------------------------------------------------
  
    async function addActivity(data: {
      action: ActivityAction;
      message: string;
      actorId: string;
      projectId: string;
      taskId?: string;
    }) {
      const existing = await prisma.activity.findFirst({
        where: {
          action: data.action,
          message: data.message,
          actorId: data.actorId,
          projectId: data.projectId,
          taskId: data.taskId ?? null,
        },
      });
  
      if (!existing) {
        await prisma.activity.create({ data });
      }
    }
  
    await addActivity({
      action: ActivityAction.PROJECT_CREATED,
      message: "Created Project Management Application",
      actorId: admin.id,
      projectId: projectOne.id,
    });
  
    await addActivity({
      action: ActivityAction.TASK_CREATED,
      message: "Created authentication API task",
      actorId: managerOne.id,
      projectId: projectOne.id,
      taskId: taskTwo.id,
    });
  
    await addActivity({
      action: ActivityAction.TASK_STATUS_CHANGED,
      message: "Moved database schema task to Completed",
      actorId: memberOne.id,
      projectId: projectOne.id,
      taskId: taskOne.id,
    });
  
    // --------------------------------------------------
    // 9. CREATE NOTIFICATIONS
    // --------------------------------------------------
  
    const notificationExists = await prisma.notification.findFirst({
      where: {
        userId: memberTwo.id,
        taskId: taskTwo.id,
        type: NotificationType.TASK_ASSIGNED,
      },
    });
  
    if (!notificationExists) {
      await prisma.notification.create({
        data: {
          userId: memberTwo.id,
          taskId: taskTwo.id,
          projectId: projectOne.id,
          type: NotificationType.TASK_ASSIGNED,
          message: "You have been assigned to Develop authentication APIs.",
        },
      });
    }
  
    console.log("Comments, activities and notifications created.");
  
    console.log("-----------------------------------");
    console.log("Database seeding completed!");
    console.log("-----------------------------------");
    console.log("Admin email:", admin.email);
    console.log("Demo user password: value configured in SEED_DEMO_PASSWORD");
  }
  
  main()
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
  