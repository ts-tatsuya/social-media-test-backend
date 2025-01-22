const { db, query } = require('../database')
const productCountOnPage = 5;

module.exports = {
    fetchAllPostings: async (req, res) => {
        try {
            const page = parseInt(req.query.page);
            const postings = await query(
                `
                SELECT p.*,u.username, COALESCE(lt.number_of_likes, 0) AS number_of_likes
                FROM postings AS p
                INNER JOIN users AS u
                ON p.user_id = u.id
                LEFT JOIN (
                    SELECT posting_id, COUNT(user_id) AS number_of_likes 
                    FROM like_transaction
                    WHERE is_like = true
                    GROUP BY posting_id
                ) AS lt
                ON p.id = lt.posting_id
                ORDER BY created_date DESC
                LIMIT ${db.escape(productCountOnPage * (page - 1))},${db.escape(productCountOnPage)}
                `
            )
            console.log(`${db.escape(productCountOnPage * (page - 1))},${db.escape(productCountOnPage)}`);
            const postingsCount = await query(`
                SELECT COUNT(id) AS total_postings
                FROM postings
            `);
            console.log(postingsCount);
            return res.status(200).send({
                page: page,
                data: postings,
                count: postings.length,
                totalPostings: postingsCount[0].total_postings
            })
        } catch (error) {
            res.status(error.status || 500).send(error);
        }

    },
    fetchPostingById: async (req, res) => {
        try {
            const postingId = parseInt(req.params.id);
            const postings = await query(
                `
                SELECT p.*,u.username, COALESCE(lt.number_of_likes, 0) AS number_of_likes
                FROM postings AS p
                INNER JOIN users AS u
                ON p.user_id = u.id
                LEFT JOIN (
                    SELECT posting_id, COUNT(user_id) AS number_of_likes 
                    FROM like_transaction
                    WHERE is_like = true
                    GROUP BY posting_id
                ) AS lt
                ON p.id = lt.posting_id
                WHERE p.id = ${db.escape(postingId)}
                ORDER BY created_date DESC
                
                `
            )
            console.log(postings);
            return res.status(200).send({
                data: postings[0]
            })
        } catch (error) {
            res.status(error.status || 500).send(error)
        }
    },
    fetchFiveRecentComments: async (req, res) => {
        try {
            const postingId = parseInt(req.params.id);
            const comments = await query(
                `
                SELECT ct.*,u.username AS username
                FROM comment_transaction AS ct
                INNER JOIN users AS u
                ON ct.user_id = u.id
                WHERE posting_id = ${db.escape(postingId)}
                ORDER BY created_date DESC
                LIMIT 0,5
                `
            )
            return res.status(200).send({
                postingId: postingId,
                comments: comments,
                count: comments.length
            })
        } catch (error) {
            res.status(error.status || 500).send(error)
        }
    },
    addNewPosting: async (req, res) => {
        try {
            console.log(req.body.data)
            const { userId, captions } = JSON.parse(req.body.data);
            console.log(userId)
            const imgUrl = req.file ? '/' + req.file.filename : null;
            const insertPostingQuery = (
                `
                INSERT INTO postings 
                VALUES 
                (
                    null, 
                    ${db.escape(userId)}, 
                    ${db.escape(captions)}, 
                    ${db.escape(imgUrl)},
                    NOW()
                )
                `
            );
            console.log(insertPostingQuery);
            const insertPostingResult = await query(insertPostingQuery);

            return res.status(201).send(
                {
                    code: 201,
                    message: 'New posting successfully added',
                    result: insertPostingResult
                }
            )
        } catch (error) {
            res.status(error.status || 500).send(error)
        }
    },
    editPostingById: async (req, res) => {
        try {
            console.log(req.body);
            const { userId, postingId, captions } = req.body;
            const postingOwner = await query(`
                SELECT *
                FROM postings
                WHERE id = ${db.escape(postingId)}
            `);
            console.log(postingOwner);
            if (postingOwner[0].user_id != userId) {
                res.status(401).send({
                    code: 401,
                    message: 'UNAUTHORIZED TO UPDATE, only post owner can edit this post'
                });
            }

            const editPostingQuery =
                `
            UPDATE postings
            SET
            ${captions ? 'captions = ' + db.escape(captions) : ''}
            WHERE id = ${db.escape(postingId)}
            `
            const editPostingResult = await query(editPostingQuery);
            res.status(200).send({
                code: 200,
                message: 'posting is updated',
                result: editPostingResult
            })

        } catch (error) {
            res.status(500).send(error);
        }
    },
    addNewComment: async (req, res) => {
        try {
            console.log(req.body.userId);
            const { userId, postingId, comments } = req.body;
            const insertCommentQuery = (
                `
                INSERT INTO comment_transaction 
                VALUES 
                (
                    null, 
                    ${db.escape(userId)}, 
                    ${db.escape(postingId)}, 
                    ${db.escape(comments)},
                    NOW()
                )
                `
            );
            console.log(insertCommentQuery);
            const insertCommentResult = await query(insertCommentQuery);

            return res.status(201).send(
                {
                    code: 201,
                    message: 'New comment successfully added',
                    result: insertCommentResult
                }
            )
        } catch (error) {
            res.status(error.status || 500).send(error)
        }
    },
    deletePosting: async (req, res) => {
        try {
            const { userId, postingId } = req.params;
            const postingOwner = await query(`
            SELECT user_id
            FROM postings
            WHERE id = ${db.escape(postingId)}
            `);
            if (postingOwner[0].user_id == userId) {
                const postingToDelete = await query(`
                    DELETE
                    FROM postings
                    WHERE id = ${db.escape(postingId)}
                `);
                res.status(202).send({
                    code: 202,
                    success: true,
                    message: 'posting successfuly deleted',
                    data: postingToDelete
                });
            } else {
                res.status(401).send({
                    code: 401,
                    message: 'UNAUTHORIZED TO DELETE, only owner of the post can delete'
                });
            }
        } catch (error) {
            res.status(500).send(error);
        }
    }

}