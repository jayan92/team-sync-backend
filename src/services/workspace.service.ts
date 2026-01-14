import mongoose from "mongoose";
import { Roles } from "../enums/role.enum";
import UserModel from "../models/user.model";
import TaskModel from "../models/task.model";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import { TaskStatusEnum } from "../enums/task.enum";
import WorkspaceModel from "../models/workspace.model";
import RoleModel from "../models/roles-permission.model";
import { BadRequestException, NotFoundException } from "../utils/appError";

// Create a new Workspace
export const createWorkspaceService = async (
  userId: string,
  body: {
    name: string;
    description?: string | undefined;
  }
) => {
  const { name, description } = body;

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundException("User not found");
  }

  const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });
  if (!ownerRole) {
    throw new NotFoundException("Owner role not found");
  }

  const workspace = new WorkspaceModel({
    name: name,
    description: description,
    owner: user._id,
  });
  await workspace.save();

  const member = new MemberModel({
    userId: user._id,
    workspaceId: workspace._id,
    role: ownerRole._id,
    joinedAt: new Date(),
  });
  await member.save();

  user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
  await user.save();

  return { workspace };
};

// To fetch all Workspace where user is member
export const getAllWorkspacesUserIsMemberService = async (userId: string) => {
  const memberships = await MemberModel.find({ userId })
    .populate("workspaceId")
    .exec(); // ensures the whole chain resolves properly

  const workspaces = memberships.map((membership) => membership.workspaceId);

  return { workspaces };
};

// Get Workspace by ID
export const getWorkspaceByIdService = async (workspaceId: string) => {
  const workspace = await WorkspaceModel.findById(workspaceId);

  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const members = await MemberModel.find({
    workspaceId,
  })
    .populate("userId")
    .populate("role");

  const workspaceWithMembers = {
    ...workspace.toObject(),
    members,
  };

  return {
    workspace: workspaceWithMembers,
  };
};

// Get all members in Workspace
export const getWorkspaceMembersService = async (workspaceId: string) => {
  const members = await MemberModel.find({ workspaceId })
    .populate("userId", "name email profilePicture -password")
    .populate("role", "name");

  const roles = await RoleModel.find({}, { name: 1, _id: 1 })
    .select("-permission")
    .lean();

  return { members, roles };
};

export const getWorkspaceAnalyticsService = async (workspaceId: string) => {
  const currentDate = new Date();

  const totalTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
  });

  const overdueTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
    dueDate: { $lt: currentDate },
    status: { $ne: TaskStatusEnum.DONE },
  });

  const completedTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
    status: TaskStatusEnum.DONE,
  });

  const analytics = {
    totalTasks,
    overdueTasks,
    completedTasks,
  };

  return { analytics };
};

export const changeWorkspaceMemberRoleService = async (
  workspaceId: string,
  memberId: string,
  roleId: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const role = await RoleModel.findById(roleId);
  if (!role) {
    throw new NotFoundException("Role not found");
  }

  const member = await MemberModel.findOne({
    userId: memberId,
    workspaceId: workspaceId,
  });

  if (!member) {
    throw new Error("Member not found in the workspace");
  }

  member.role = role;
  await member.save();

  return { member };
};

export const updateWorkspaceByIdService = async (
  workspaceId: string,
  name: string,
  description?: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Update the workspace details
  workspace.name = name || workspace.name;
  workspace.description = description || workspace.description;
  await workspace.save();

  return { workspace };
};

// Service to delete a workspace and all its related data, ensuring only the owner can perform the action
export const deleteWorkspaceService = async (
  workspaceId: string,
  userId: string
) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch the workspace by ID within the transaction
    const workspace = await WorkspaceModel.findById(workspaceId).session(
      session
    );
    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    // Check if the requesting user is the owner of the workspace
    if (!workspace.owner.equals(new mongoose.Types.ObjectId(userId))) {
      throw new BadRequestException(
        "You are not authorized to delete this workspace"
      );
    }

    // Fetch the user to potentially update their currentWorkspace
    const user = await UserModel.findById(userId).session(session);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Delete all projects associated with the workspace
    await ProjectModel.deleteMany({ workspace: workspace._id }).session(
      session
    );

    // Delete all tasks associated with the workspace
    await TaskModel.deleteMany({ workspace: workspace._id }).session(session);

    // Delete all member records linked to the workspace
    await MemberModel.deleteMany({
      workspaceId: workspace._id,
    }).session(session);

    // If the user's currentWorkspace is the one being deleted, update it
    if (user?.currentWorkspace?.equals(workspaceId)) {
      // Find another workspace the user is a member of
      const memberWorkspace = await MemberModel.findOne({ userId }).session(
        session
      );

      // Update currentWorkspace to another workspace or null
      user.currentWorkspace = memberWorkspace
        ? memberWorkspace.workspaceId
        : null;

      // Save the updated user document
      await user.save({ session });
    }

    // Delete the workspace itself
    await workspace.deleteOne({ session });

    // Commit the transaction to apply all changes
    await session.commitTransaction();

    // End the session
    session.endSession();

    // Return the updated currentWorkspace value
    return {
      currentWorkspace: user.currentWorkspace,
    };
  } catch (error) {
    // Roll back all changes if any error occurs
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
