import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  inviteStaff,
  setPasswordWithInvite,
  getAllStaff,
  deactivateStaff,
  activateStaff,
  deleteStaff,
  resendInvite,
} from '../db/staff';
import { logAudit } from '../db/auditLogs';
import { sendStaffInviteEmail } from '../utils/email';

const router = Router();

/**
 * Admin-only middleware
 */
function adminOnly(req: AuthRequest, res: Response, next: Function) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only admins can manage staff',
    });
  }
  next();
}

/**
 * POST /api/staff/invite
 * Send invite to new staff member (admin only)
 */
router.post(
  '/invite',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, name, role } = req.body;

      if (!email || !name || !role) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'email, name, role required',
        });
      }

      const { staff, inviteLink } = await inviteStaff(
        email,
        name,
        role,
        req.user!.email
      );

      // ✅ SEND EMAIL
      const emailSent = await sendStaffInviteEmail(
        email,
        name,
        inviteLink,
        req.user!.name
      );


      // Log the action
      await logAudit(
        req.user!.email,
        req.user!.id,
        'admin',
        'invite_staff',
        'staff',
        email,
        `Invited ${role} staff member${emailSent ? ' (email sent)' : ' (email failed)'}`,
        { staffName: name, emailSent }
      );

      res.json({
        success: true,
        message: emailSent ? 'Invite sent via email' : 'Invite created but email failed',
        inviteLink,
        emailSent,
        staff: {
          email: staff.email,
          name: staff.name,
          role: staff.role,
          status: staff.status,
        },
      });
    } catch (error) {
      console.error('Error inviting staff:', error);
      res.status(500).json({
        error: 'Failed to send invite',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/staff/setup-password
 * Set password with invite token (public - no auth needed)
 */
router.post('/setup-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'token and password required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 6 characters',
      });
    }

    const staff = await setPasswordWithInvite(token, password);

    res.json({
      success: true,
      message: 'Password set successfully',
      staff: {
        email: staff.email,
        name: staff.name,
      },
    });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(400).json({
      error: 'Failed to set password',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/staff/list
 * Get all staff (admin only)
 */
router.get(
  '/list',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const staff = await getAllStaff();
      res.json({
        success: true,
        data: staff.map(s => ({
          email: s.email,
          name: s.name,
          role: s.role,
          status: s.status,
          passwordSet: s.passwordSet,
          createdAt: s.createdAt,
          lastLogin: s.lastLogin,
        })),
      });
    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({ error: 'Failed to fetch staff' });
    }
  }
);

/**
 * POST /api/staff/deactivate
 * Deactivate staff member (admin only)
 */
router.post(
  '/deactivate',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const success = await deactivateStaff(email);

      if (!success) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      await logAudit(
        req.user!.email,
        req.user!.id,
        'admin',
        'deactivate_staff',
        'staff',
        email,
        'Staff member deactivated'
      );

      res.json({
        success: true,
        message: 'Staff member deactivated',
      });
    } catch (error) {
      console.error('Error deactivating staff:', error);
      res.status(500).json({ error: 'Failed to deactivate staff' });
    }
  }
);

/**
 * POST /api/staff/activate
 * Activate staff member (admin only)
 */
router.post(
  '/activate',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const success = await activateStaff(email);

      if (!success) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      await logAudit(
        req.user!.email,
        req.user!.id,
        'admin',
        'activate_staff',
        'staff',
        email,
        'Staff member activated'
      );

      res.json({
        success: true,
        message: 'Staff member activated',
      });
    } catch (error) {
      console.error('Error activating staff:', error);
      res.status(500).json({ error: 'Failed to activate staff' });
    }
  }
);

/**
 * POST /api/staff/remove
 * Remove staff member (admin only)
 */
router.post(
  '/remove',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const success = await deleteStaff(email);

      if (!success) {
        return res.status(404).json({ error: 'Staff not found' });
      }

      await logAudit(
        req.user!.email,
        req.user!.id,
        'admin',
        'remove_staff',
        'staff',
        email,
        'Staff member removed'
      );

      res.json({
        success: true,
        message: 'Staff member removed',
      });
    } catch (error) {
      console.error('Error removing staff:', error);
      res.status(500).json({ error: 'Failed to remove staff' });
    }
  }
);

/**
 * POST /api/staff/resend-invite
 * Resend invite to staff member (admin only)
 */
router.post(
  '/resend-invite',
  authMiddleware,
  adminOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const inviteLink = await resendInvite(email);

      res.json({
        success: true,
        message: 'Invite resent',
        inviteLink,
      });
    } catch (error) {
      console.error('Error resending invite:', error);
      res.status(500).json({
        error: 'Failed to resend invite',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;