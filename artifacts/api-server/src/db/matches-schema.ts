import { Db, ObjectId } from 'mongodb';
/**

Match Document Schema
Stores match recommendations between users
*/
export interface Match {
_id?: ObjectId;
userId: ObjectId;              // Primary user (one who is being matched)
candidateId: ObjectId;         // Matched candidate
score: number;                 // 0-100 match score
breakdown: {
age: number;
location: number;
caste: number;
education: number;
income: number;
profession?: number;
height?: number;
houseStatus?: number;
};
status: 'suggested' | 'approved' | 'rejected' | 'expired';
hardFiltersPassed: boolean;
hardFilterFailures?: string[];
createdAt: Date;
expiresAt: Date;               // 30 days from creation
approvedAt?: Date;
approvedBy?: ObjectId;
rejectedAt?: Date;
rejectedBy?: ObjectId;
rejectionReason?: string;
}

/**

Initialize the matches collection with proper indexes
*/
export async function initMatchesCollection(db: Db): Promise<void> {
try {
const matchesCollection = db.collection('matches');
// Create indexes for efficient querying
console.log('📊 Creating indexes for matches collection...');
// Index 1: Find matches for a user
await matchesCollection.createIndex({ userId: 1, status: 1 });
console.log('   ✓ Index: userId + status');
// Index 2: Find who matched with a candidate
await matchesCollection.createIndex({ candidateId: 1, status: 1 });
console.log('   ✓ Index: candidateId + status');
// Index 3: Sort by score
await matchesCollection.createIndex({ score: -1 });
console.log('   ✓ Index: score (descending)');
// Index 4: Auto-delete expired matches (TTL index)
// MongoDB will automatically delete documents when expiresAt is reached
await matchesCollection.createIndex(
{ expiresAt: 1 },
{ expireAfterSeconds: 0 }
);
console.log('   ✓ Index: TTL expiry (auto-delete after 30 days)');
// Index 5: Prevent duplicate matches
await matchesCollection.createIndex(
{ userId: 1, candidateId: 1 },
{ unique: true }
);
console.log('   ✓ Index: Unique constraint (userId + candidateId)');
console.log('✓ Matches collection ready!');
} catch (error) {
if (error instanceof Error && error.message.includes('already exists')) {
console.log('ℹ Matches collection indexes already exist');
} else {
throw error;
}
}
}

/**

Helper function to create a new match document
*/
export function createMatchDocument(
userId: string | ObjectId,
candidateId: string | ObjectId,
score: number,
breakdown: Match['breakdown'],
hardFiltersPassed: boolean = true,
hardFilterFailures: string[] = []
): Match {
const now = new Date();
const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

return {
userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
candidateId: typeof candidateId === 'string' ? new ObjectId(candidateId) : candidateId,
score,
breakdown,
status: 'suggested',
hardFiltersPassed,
hardFilterFailures: hardFilterFailures.length > 0 ? hardFilterFailures : undefined,
createdAt: now,
expiresAt,
};
}