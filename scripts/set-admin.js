const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setAdminUser() {
  try {
    const adminEmail = 'arvind8mathur@gmail.com';
    
    // Update the user to be admin
    const updatedUser = await prisma.user.updateMany({
      where: {
        email: adminEmail
      },
      data: {
        isAdmin: true
      }
    });

    if (updatedUser.count > 0) {
      console.log(`✅ Successfully set ${adminEmail} as admin`);
    } else {
      console.log(`⚠️  No user found with email ${adminEmail}`);
    }
  } catch (error) {
    console.error('❌ Error setting admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminUser();