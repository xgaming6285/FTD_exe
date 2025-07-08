import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
  Card,
  CardContent,
  Link,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  Telegram as TelegramIcon,
  WhatsApp as WhatsAppIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  ExpandMore as ExpandMoreIcon,
  Computer as SessionIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import SessionStatusChip from './SessionStatusChip';
import SessionAccessButton from './SessionAccessButton';
import SessionMetadataDialog from './SessionMetadataDialog';
const LeadDetailCard = ({ lead }) => {
  const user = useSelector(selectUser);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const formatDate = (date) => {
    return date ? new Date(date).toLocaleDateString() : 'N/A';
  };
  const formatDateTime = (date) => {
    return date ? new Date(date).toLocaleString() : 'N/A';
  };
  const getSocialMediaIcon = (platform) => {
    const icons = {
      facebook: <FacebookIcon color="primary" />,
      twitter: <TwitterIcon color="info" />,
      linkedin: <LinkedInIcon color="primary" />,
      instagram: <InstagramIcon color="secondary" />,
      telegram: <TelegramIcon color="info" />,
      whatsapp: <WhatsAppIcon color="success" />,
    };
    return icons[platform] || <PersonIcon />;
  };
  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      contacted: 'info',
      converted: 'warning',
      inactive: 'error',
    };
    return colors[status] || 'default';
  };
  const getPriorityColor = (priority) => {
    const colors = {
      high: 'error',
      medium: 'warning',
      low: 'info',
    };
    return colors[priority] || 'default';
  };
  return (
    <Card elevation={2} sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={3}>
          {}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">
                  {lead.firstName} {lead.lastName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                  <Chip
                    label={lead.leadType?.toUpperCase()}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={lead.status || 'Active'}
                    size="small"
                    color={getStatusColor(lead.status)}
                  />
                  <Chip
                    label={`Priority: ${lead.priority || 'Medium'}`}
                    size="small"
                    color={getPriorityColor(lead.priority)}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>
          {}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom color="primary">
              <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Contact Information
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><EmailIcon color="action" /></ListItemIcon>
                <ListItemText
                  primary="Current Email"
                  secondary={lead.newEmail || 'N/A'}
                />
              </ListItem>
              {lead.oldEmail && (
                <ListItem>
                  <ListItemIcon><EmailIcon color="disabled" /></ListItemIcon>
                  <ListItemText
                    primary="Previous Email"
                    secondary={lead.oldEmail}
                  />
                </ListItem>
              )}
              <ListItem>
                <ListItemIcon><PhoneIcon color="action" /></ListItemIcon>
                <ListItemText
                  primary="Current Phone"
                  secondary={lead.newPhone || 'N/A'}
                />
              </ListItem>
              {lead.oldPhone && (
                <ListItem>
                  <ListItemIcon><PhoneIcon color="disabled" /></ListItemIcon>
                  <ListItemText
                    primary="Previous Phone"
                    secondary={lead.oldPhone}
                  />
                </ListItem>
              )}
              <ListItem>
                <ListItemIcon><LocationIcon color="action" /></ListItemIcon>
                <ListItemText
                  primary="Country"
                  secondary={lead.country || 'N/A'}
                />
              </ListItem>
            </List>
          </Grid>
          {}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom color="primary">
              <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Personal Information
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><PersonIcon color="action" /></ListItemIcon>
                <ListItemText
                  primary="Gender"
                  secondary={lead.gender || 'Not specified'}
                />
              </ListItem>
              {lead.dob && (
                <ListItem>
                  <ListItemIcon><CalendarIcon color="action" /></ListItemIcon>
                  <ListItemText
                    primary="Date of Birth"
                    secondary={formatDate(lead.dob)}
                  />
                </ListItem>
              )}
              {lead.address && (
                <ListItem>
                  <ListItemIcon><LocationIcon color="action" /></ListItemIcon>
                  <ListItemText
                    primary="Address"
                    secondary={lead.address}
                  />
                </ListItem>
              )}
              {lead.sin && (
                <ListItem>
                  <ListItemIcon><AssignmentIcon color="action" /></ListItemIcon>
                  <ListItemText
                    primary="SIN"
                    secondary={lead.sin}
                  />
                </ListItem>
              )}
              {lead.source && (
                <ListItem>
                  <ListItemIcon><AssignmentIcon color="action" /></ListItemIcon>
                  <ListItemText
                    primary="Source"
                    secondary={lead.source}
                  />
                </ListItem>
              )}
            </List>
          </Grid>
          {}
          {(lead.client || lead.clientBroker || lead.clientNetwork) && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom color="primary">
                <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Business Information
              </Typography>
              <Grid container spacing={2}>
                {lead.client && (
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Client</Typography>
                    <Typography variant="body1">{lead.client}</Typography>
                  </Grid>
                )}
                {lead.clientBroker && (
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Client Broker</Typography>
                    <Typography variant="body1">{lead.clientBroker}</Typography>
                  </Grid>
                )}
                {lead.clientNetwork && (
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Client Network</Typography>
                    <Typography variant="body1">{lead.clientNetwork}</Typography>
                  </Grid>
                )}
              </Grid>
            </Grid>
          )}
          {}
          {lead.socialMedia && Object.values(lead.socialMedia).some(value => value) && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom color="primary">
                Social Media
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(lead.socialMedia).map(([platform, value]) => (
                  value && (
                    <Grid item xs={12} sm={6} md={4} key={platform}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getSocialMediaIcon(platform)}
                        <Link href={value} target="_blank" rel="noopener">
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </Link>
                      </Box>
                    </Grid>
                  )
                ))}
              </Grid>
            </Grid>
          )}
          {}
          {lead.documents && lead.documents.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" color="primary">
                    <AttachFileIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Documents ({lead.documents.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {lead.documents.map((doc, index) => (
                      <ListItem key={index}>
                        <ListItemIcon><AttachFileIcon color="action" /></ListItemIcon>
                        <ListItemText
                          primary={
                            <Link href={doc.url} target="_blank" rel="noopener">
                              {doc.description || `Document ${index + 1}`}
                            </Link>
                          }
                          secondary={doc.url}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
          {}
          {lead.comments && lead.comments.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" color="primary">
                    <CommentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Comments ({lead.comments.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {lead.comments.map((comment, index) => (
                      <ListItem key={index} alignItems="flex-start">
                        <ListItemText
                          primary={comment.text}
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                By: {comment.author?.fullName || 'Unknown'}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(comment.createdAt)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
          {}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom color="primary">
              System Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body1">{formatDateTime(lead.createdAt)}</Typography>
              </Grid>
              {lead.assignedAt && (
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Assigned</Typography>
                  <Typography variant="body1">{formatDateTime(lead.assignedAt)}</Typography>
                </Grid>
              )}
              {lead.assignedTo && (
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Assigned To</Typography>
                  <Typography variant="body1">{lead.assignedTo.fullName || 'Unknown'}</Typography>
                </Grid>
              )}
            </Grid>
          </Grid>
          {}
          {lead.leadType === 'ftd' && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom color="primary">
                <SessionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Browser Session
              </Typography>
              {lead.browserSession && lead.browserSession.sessionId ? (
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <SessionStatusChip sessionData={lead.browserSession} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Created</Typography>
                    <Typography variant="body1">
                      {formatDateTime(lead.browserSession.createdAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Last Accessed</Typography>
                    <Typography variant="body1">
                      {formatDateTime(lead.browserSession.lastAccessedAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Domain</Typography>
                    <Typography variant="body1">
                      {lead.browserSession.metadata?.domain || 'N/A'}
                    </Typography>
                  </Grid>
                  {}
                  <Grid item xs={12}>
                    <Box sx={{
                      bgcolor: 'action.hover',
                      p: 2,
                      borderRadius: 1,
                      mt: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Session Data Summary
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              🍪 Cookies: {lead.browserSession.cookies?.length || 0}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              💾 localStorage: {lead.browserSession.localStorage ?
                                Object.keys(lead.browserSession.localStorage).length : 0} items
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              🗂️ sessionStorage: {lead.browserSession.sessionStorage ?
                                Object.keys(lead.browserSession.sessionStorage).length : 0} items
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      {}
                      {(() => {
                        const createdAt = new Date(lead.browserSession.createdAt);
                        const expirationDate = new Date(createdAt.getTime() + (30 * 24 * 60 * 60 * 1000));
                        const daysUntilExpiration = Math.ceil((expirationDate - new Date()) / (24 * 60 * 60 * 1000));
                        if (daysUntilExpiration <= 0) {
                          return (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                                ⚠️ Session Expired - Cannot be accessed
                              </Typography>
                            </Box>
                          );
                        } else if (daysUntilExpiration <= 7) {
                          return (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                                ⏰ Session expires in {daysUntilExpiration} day(s) - Access soon!
                              </Typography>
                            </Box>
                          );
                        }
                        return null;
                      })()}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <SessionAccessButton
                        lead={lead}
                        user={user}
                        variant="button"
                        onSessionAccess={(lead, response) => {
                          console.log('Session access initiated:', response);
                        }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<InfoIcon />}
                        onClick={() => setSessionDialogOpen(true)}
                      >
                        View Details
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{
                  bgcolor: 'action.hover',
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No browser session data available for this FTD lead.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    A session will be created automatically when the FTD injection is completed.
                  </Typography>
                </Box>
              )}
            </Grid>
          )}
        </Grid>
      </CardContent>
      {}
      <SessionMetadataDialog
        open={sessionDialogOpen}
        onClose={() => setSessionDialogOpen(false)}
        lead={lead}
        sessionData={lead.browserSession}
      />
    </Card>
  );
};
export default LeadDetailCard;