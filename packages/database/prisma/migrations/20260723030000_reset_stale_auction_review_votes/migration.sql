-- Review votes belong to one result round. Open/relisted auctions have no active
-- result to review, while a pending review may only use votes cast after the
-- current round ended.
DELETE FROM "AuctionReviewVote" AS vote
USING "Auction" AS auction
WHERE vote."auctionId" = auction.id
  AND (
    auction.status IN ('OPEN', 'RELISTED')
    OR (
      auction.status = 'PENDING_REVIEW'
      AND vote."updatedAt" < COALESCE(
        (
          SELECT MAX(log."createdAt")
          FROM "AuditLog" AS log
          WHERE log."targetType" = 'Auction'
            AND log."targetId" = auction.id
            AND (
              log.action = 'FORCE_REVIEW'
              OR (
                log.action = 'AUCTION_FINALIZED'
                AND log.metadata ->> 'status' = 'PENDING_REVIEW'
              )
            )
        ),
        auction."endsAt"
      )
    )
  );

-- Votes attached to an already invalidated bid are no longer actionable. The
-- immutable audit log remains the historical record of the decision.
DELETE FROM "AuctionBidInvalidationVote" AS vote
USING "AuctionBid" AS bid
WHERE vote."bidId" = bid.id
  AND bid."isValid" = false;
